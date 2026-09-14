package api

import (
	"io"
	"net/http"
	"strconv"

	"github.com/eetr-ai/journal/platform/internal/store"
)

// workingLimit bounds one serialized agent context. Generous, because it is a
// whole conversation's worth of prompt, but not unbounded.
const workingLimit = 16 << 20

func intHeader(r *http.Request, name string) int {
	ret, _ := strconv.Atoi(r.Header.Get(name))

	return ret
}

// loadWorking answers 404 for a conversation that has not started, which the
// runtime reads as "resume from nothing" — the right answer, not a failure.
func (s *Server) loadWorking(w http.ResponseWriter, r *http.Request) {
	working, err := s.config.Store.LoadWorking(r.Context(), r.PathValue("agentId"), r.PathValue("threadKey"))
	if err != nil {
		s.fail(w, err, "load working memory")

		return
	}

	w.Header().Set(versionHeader, strconv.FormatInt(working.Version, 10))
	w.Header().Set(iterationHeader, strconv.Itoa(working.Iteration))
	w.Header().Set(tokensHeader, strconv.Itoa(working.Tokens))
	w.Header().Set("content-type", "application/octet-stream")
	_, _ = w.Write(working.Value)
}

// saveWorking creates the conversation when it is new, so nothing here can
// legitimately be missing — a 404 on this route tells the runtime we do not
// implement agent memory at all, and it stops asking for the life of the
// process. The payload is opaque: it is the engine's serialized transcript, and
// storing the bytes unexamined is what lets that format change without touching
// this file.
func (s *Server) saveWorking(w http.ResponseWriter, r *http.Request) {
	value, err := io.ReadAll(io.LimitReader(r.Body, workingLimit))
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "the body could not be read")

		return
	}

	version, err := s.config.Store.SaveWorking(r.Context(),
		r.PathValue("agentId"), r.PathValue("threadKey"), r.URL.Query().Get("userId"),
		store.Working{
			Value:     value,
			Iteration: intHeader(r, iterationHeader),
			Tokens:    intHeader(r, tokensHeader),
		},
		expectedVersion(r))
	if err != nil {
		s.fail(w, err, "save working memory")

		return
	}

	w.Header().Set(versionHeader, strconv.FormatInt(version, 10))
	w.WriteHeader(http.StatusOK)
}

type appendTurnsRequest struct {
	Turns []store.Turn `json:"turns"`
}

type versionResponse struct {
	Version int64 `json:"version"`
}

// appendTurns writes the record a person reads when they open a past
// conversation. Append-only and never compacted — keeping it apart from working
// memory is the whole point, because making room for the model must not destroy
// the record.
func (s *Server) appendTurns(w http.ResponseWriter, r *http.Request) {
	var request appendTurnsRequest
	if !decode(w, r, &request) {
		return
	}

	if len(request.Turns) > maxTurnsPerAppend {
		writeError(w, http.StatusRequestEntityTooLarge, "too_many_turns",
			"more turns than discovery promised to take in one append")

		return
	}

	// Nothing is embedded here. The runtime bounds this call at ten seconds by
	// default, and an embeddings provider does not reliably answer inside that
	// — a turn recorded without a vector is searchable a beat late, while a turn
	// that timed out is gone.
	version, err := s.config.Store.AppendTurns(r.Context(),
		r.PathValue("agentId"), r.PathValue("threadKey"), r.URL.Query().Get("userId"),
		request.Turns)
	if err != nil {
		s.fail(w, err, "append turns")

		return
	}

	writeJSON(w, http.StatusOK, versionResponse{Version: version})
}

type setTitleRequest struct {
	Title string `json:"title"`
}

// setTitle is its own route because naming a conversation is a judgement the
// runtime does not make on its own.
func (s *Server) setTitle(w http.ResponseWriter, r *http.Request) {
	var request setTitleRequest
	if !decode(w, r, &request) {
		return
	}

	err := s.config.Store.SetTitle(r.Context(), r.PathValue("agentId"), r.PathValue("threadKey"),
		r.URL.Query().Get("userId"), request.Title)
	if err != nil {
		s.fail(w, err, "set title")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type listThreadsResponse struct {
	Threads []store.Thread `json:"threads"`
	Next    string         `json:"next,omitempty"`
}

func pageLimit(r *http.Request) int {
	ret, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	return ret
}

func (s *Server) listThreads(w http.ResponseWriter, r *http.Request) {
	threads, next, err := s.config.Store.ListThreads(r.Context(), r.PathValue("agentId"),
		r.URL.Query().Get("userId"), r.URL.Query().Get("cursor"), pageLimit(r))
	if err != nil {
		s.fail(w, err, "list threads")

		return
	}

	writeJSON(w, http.StatusOK, listThreadsResponse{Threads: threads, Next: next})
}

type readThreadResponse struct {
	Thread store.Thread `json:"thread"`
	Turns  []store.Turn `json:"turns"`
	Next   string       `json:"next,omitempty"`
}

func (s *Server) readThread(w http.ResponseWriter, r *http.Request) {
	thread, turns, next, err := s.config.Store.ReadThread(r.Context(), r.PathValue("agentId"),
		r.PathValue("threadKey"), r.URL.Query().Get("cursor"), pageLimit(r))
	if err != nil {
		s.fail(w, err, "read thread")

		return
	}

	writeJSON(w, http.StatusOK, readThreadResponse{Thread: thread, Turns: turns, Next: next})
}

// deleteThread is the one operation that must not report false success: if we
// still hold a copy, we do not answer until we do not.
func (s *Server) deleteThread(w http.ResponseWriter, r *http.Request) {
	err := s.config.Store.DeleteThread(r.Context(), r.PathValue("agentId"), r.PathValue("threadKey"))
	if err != nil {
		s.fail(w, err, "delete thread")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
