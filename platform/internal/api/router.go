// Package api is the octo platform API, as this sidecar answers it.
//
// One rule shapes everything here: 404 means "nothing stored" and 501 means
// "not implemented", and confusing the two is the expensive mistake. The
// runtime turns a whole capability off for the life of the process when it sees
// a 501, so the catch-all at the bottom of this router answers 501 rather than
// letting Go's default 404 masquerade as a miss.
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/eetr-ai/journal/platform/internal/bus"
	"github.com/eetr-ai/journal/platform/internal/embed"
	"github.com/eetr-ai/journal/platform/internal/locks"
	"github.com/eetr-ai/journal/platform/internal/store"
)

const (
	versionHeader   = "X-Object-Version"
	iterationHeader = "X-Agent-Iteration"
	tokensHeader    = "X-Agent-Tokens"

	// maxValueBytes is what discovery promises for one kv value.
	maxValueBytes = 1 << 20
	// ackDeadline is how long a delivery stays invisible before it is reclaimed.
	ackDeadline = 60 * time.Second
	// pollCeiling caps a long poll, so a caller cannot hold a connection open
	// for longer than the runtime was told to expect.
	pollCeiling = 20 * time.Second
	// leaderTTL and its intervals must stay comfortably more than three renews
	// apart, or a leader that loses contact with us and a successor both
	// believe they hold the key.
	leaderTTLSeconds      = 15
	leaderRenewSeconds    = 5
	leaderObserveSeconds  = 2
	leaseMinTTLSeconds    = 1
	leaseMaxTTLSeconds    = 600
	maxTurnsPerAppend     = 100
	maxBatch              = 8
	embeddingDimensions   = 1024
	defaultEmbeddingModel = "qwen/qwen3-embedding-8b"
)

// Config is everything a Server is built from. A struct rather than eight
// arguments, so a caller cannot transpose two of them silently.
type Config struct {
	Store    store.Store
	Locks    locks.Locks
	Bus      bus.Bus
	Embedder embed.Embedder
	Name     string
	Version  string
	// SecretsSealed is what discovery promises about the *_secrets namespaces.
	// It is passed in rather than inferred, because only the caller knows
	// whether it wrapped the store in one that seals.
	SecretsSealed bool
	// Resources is the integration's own files. Unconfigured, the capability is
	// declared off and the runtime reports every one of them as missing.
	Resources Resources
	Log       *slog.Logger
}

// Server answers the contract. Every collaborator is passed in: there is no
// lookup, no registry, and nothing here reaches for a global.
type Server struct {
	config Config
}

func NewServer(config Config) *Server {
	return &Server{config: config}
}

// Handler wires every route. Paths carry their method, so a route registered
// here for one verb does not swallow another.
func (s *Server) Handler() http.Handler {
	ret := http.NewServeMux()

	ret.HandleFunc("GET /v1/discovery", s.getDiscovery)

	ret.HandleFunc("GET /v1/resources/content", s.getResource)

	ret.HandleFunc("GET /v1/kv/{namespace}/entry", s.getEntry)
	ret.HandleFunc("PUT /v1/kv/{namespace}/entry", s.putEntry)
	ret.HandleFunc("DELETE /v1/kv/{namespace}/entry", s.deleteEntry)

	ret.HandleFunc("POST /v1/leases/acquire", s.acquireLease)
	ret.HandleFunc("POST /v1/leases/{leaseId}/renew", s.renewLease)
	ret.HandleFunc("POST /v1/leases/{leaseId}/release", s.releaseLease)

	ret.HandleFunc("POST /v1/leader/{key}/campaign", s.campaign)
	ret.HandleFunc("POST /v1/leader/{key}/resign", s.resign)

	ret.HandleFunc("POST /v1/queues/{subject}/publish", s.publishQueue)
	ret.HandleFunc("POST /v1/queues/{subject}/receive", s.receiveQueue)
	ret.HandleFunc("POST /v1/queues/{subject}/ack", s.ackQueue)
	ret.HandleFunc("POST /v1/queues/{subject}/nack", s.nackQueue)

	ret.HandleFunc("POST /v1/topics/{subject}/publish", s.publishTopic)
	ret.HandleFunc("POST /v1/topics/{subject}/subscriptions", s.subscribeTopic)
	ret.HandleFunc("POST /v1/topics/{subject}/receive", s.receiveTopic)
	ret.HandleFunc("POST /v1/topics/{subject}/ack", s.ackTopic)
	ret.HandleFunc("DELETE /v1/topics/{subject}/subscriptions/{subscriptionId}", s.unsubscribeTopic)

	ret.HandleFunc("GET /v1/agent-memory/{agentId}/threads/{threadKey}/working", s.loadWorking)
	ret.HandleFunc("PUT /v1/agent-memory/{agentId}/threads/{threadKey}/working", s.saveWorking)
	ret.HandleFunc("POST /v1/agent-memory/{agentId}/threads/{threadKey}/turns", s.appendTurns)
	ret.HandleFunc("PUT /v1/agent-memory/{agentId}/threads/{threadKey}/title", s.setTitle)
	ret.HandleFunc("GET /v1/agent-memory/{agentId}/threads/{threadKey}", s.readThread)
	ret.HandleFunc("DELETE /v1/agent-memory/{agentId}/threads/{threadKey}", s.deleteThread)
	ret.HandleFunc("GET /v1/agent-memory/{agentId}/threads", s.listThreads)
	ret.HandleFunc("GET /v1/agent-memory/{agentId}/users/{userId}/memories", s.listMemories)
	ret.HandleFunc("PUT /v1/agent-memory/{agentId}/users/{userId}/memories", s.putMemory)
	ret.HandleFunc("DELETE /v1/agent-memory/{agentId}/users/{userId}/memories", s.deleteMemory)
	ret.HandleFunc("POST /v1/agent-memory/{agentId}/search", s.searchMemory)

	ret.HandleFunc("/", notImplemented)

	return ret
}

// notImplemented is what a route we have not written must answer. Never 404:
// the runtime reads that as "nothing stored" and keeps asking forever.
func notImplemented(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "this route is not implemented")
}

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	var ret errorBody
	ret.Error.Code = code
	ret.Error.Message = message

	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ret)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// fail turns a store error into the status the contract asks for. A conflict is
// the only failure the runtime acts on; everything else it retries or logs.
func (s *Server) fail(w http.ResponseWriter, err error, what string) {
	switch {
	case errors.Is(err, store.ErrConflict):
		writeError(w, http.StatusConflict, "version_conflict", "the expected version is not the current one")
	case errors.Is(err, store.ErrMissing):
		w.WriteHeader(http.StatusNotFound)
	default:
		s.config.Log.Error("platform api failed", "operation", what, "error", err)
		writeError(w, http.StatusInternalServerError, "internal", "the request could not be completed")
	}
}

// expectedVersion reads the caller's belief about the current version. Absent
// and 0 mean the same thing, which on a write is "create" and on a delete is
// "unconditionally".
//
// A header that is present but unreadable is NOT either of those: treating a
// malformed value as 0 would turn a conditional delete into an unconditional
// one, which is the check failing open.
func expectedVersion(r *http.Request) (int64, bool) {
	raw := r.Header.Get(versionHeader)

	if raw == "" {
		return 0, true
	}

	ret, err := strconv.ParseInt(raw, 10, 64)

	return ret, err == nil && ret >= 0
}

// ttlFrom bounds a claim's lifetime to what discovery advertised. Zero is the
// dangerous one: Redis takes a SET with no expiry, and a lease that never lapses
// is a name out of service for good.
func ttlFrom(seconds int64, minSeconds, maxSeconds int) (time.Duration, bool) {
	if seconds < int64(minSeconds) || seconds > int64(maxSeconds) {
		return 0, false
	}

	return time.Duration(seconds) * time.Second, true
}

func badVersion(w http.ResponseWriter) {
	writeError(w, http.StatusBadRequest, "bad_version",
		"X-Object-Version must be a non-negative integer")
}

func badTTL(w http.ResponseWriter) {
	writeError(w, http.StatusBadRequest, "bad_ttl", "ttlSeconds is outside the advertised bounds")
}

func decode(w http.ResponseWriter, r *http.Request, into any) bool {
	if err := json.NewDecoder(r.Body).Decode(into); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "the body is not the JSON this route expects")

		return false
	}

	return true
}

// pollFor bounds a long poll. A caller asking for longer than we advertised
// gets what we advertised, not what it asked for.
func pollFor(seconds int64) time.Duration {
	if seconds <= 0 {
		return pollCeiling
	}

	ret := time.Duration(seconds) * time.Second
	if ret > pollCeiling {
		return pollCeiling
	}

	return ret
}

func batchOf(requested int) int {
	if requested <= 0 || requested > maxBatch {
		return maxBatch
	}

	return requested
}
