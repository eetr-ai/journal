package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/eetr-ai/journal/platform/internal/seal"
	"github.com/eetr-ai/journal/platform/internal/store"
)

// The context a flow chose to forward with an agent-memory call.
//
// The runtime resolves it once per run from the message the agent was invoked
// with and keeps no copy, which is the only reason a key can reach this process
// at all: it travels with the request that needs it instead of sitting in
// configuration outliving the run.
//
// Treat what comes out of here as a credential. It is never logged and never
// written down beside what it protects.

const (
	contextHeader = "X-Octo-Agent-Context"
	// What a person's memory is sealed under. One entry of the forwarded map;
	// the rest, if a flow ever forwards more, is not ours to read.
	contextKeyName = "key"
	// The header is a channel for a key, not for data, and it rides every turn
	// of every agent.
	contextLimit = 8 << 10
)

// ErrForwardedContext is a header that is present and cannot be read.
var ErrForwardedContext = errors.New("forwarded context")

// forwardedContext reads what the flow forwarded with this request.
//
// Absent is not an error: a flow that forwards nothing must behave exactly as
// this contract did before the header existed. Present and unreadable is a
// different answer entirely — the caller meant to forward something and we did
// not get it, and serving the call as though nobody had asked is the silent
// wrong answer for the one kind of value worth forwarding.
func forwardedContext(r *http.Request) (map[string]string, error) {
	value := r.Header.Get(contextHeader)

	if value == "" {
		return map[string]string{}, nil
	}

	if len(value) > contextLimit {
		return nil, fmt.Errorf("%w: over %d bytes", ErrForwardedContext, contextLimit)
	}

	raw, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, fmt.Errorf("%w: not unpadded base64url", ErrForwardedContext)
	}

	// Through *string rather than string so a null VALUE is distinguishable:
	// into a map[string]string, {"key":null} lands as {"key":""} without
	// complaint, and an empty key is not a key.
	var decoded map[string]*string

	if err := json.Unmarshal(raw, &decoded); err != nil {
		return nil, fmt.Errorf("%w: not a JSON object of strings", ErrForwardedContext)
	}

	if decoded == nil {
		return nil, fmt.Errorf("%w: holds null, not an object", ErrForwardedContext)
	}

	ret := make(map[string]string, len(decoded))

	for name, entry := range decoded {
		if entry == nil {
			return nil, fmt.Errorf("%w: entry %q is null", ErrForwardedContext, name)
		}

		ret[name] = *entry
	}

	return ret, nil
}

// memory is the store this agent-memory call goes through: the plain one when
// the flow forwarded no key, and one that seals under the forwarded key when it
// did.
//
// Built per request and dropped with it. Nothing caches a Sealer, because a key
// that outlives the request that carried it is the thing this whole mechanism
// exists to avoid.
func (s *Server) memory(w http.ResponseWriter, r *http.Request) (store.Store, bool) {
	forwarded, err := forwardedContext(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_forwarded_context", err.Error())

		return nil, false
	}

	key := forwarded[contextKeyName]

	if key == "" {
		return s.config.Store, true
	}

	sealer, err := seal.New(key)
	if err != nil {
		// Deliberately not echoing err: it is about the shape of a secret.
		writeError(w, http.StatusBadRequest, "bad_forwarded_context",
			"the forwarded key is not a base64 AES-256 key")

		return nil, false
	}

	return store.NewPrivate(s.config.Store, sealer, s.config.Vectors), true
}
