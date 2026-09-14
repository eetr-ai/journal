package api

import (
	"net/http"
	"strconv"

	"github.com/eetr-ai/journal/platform/internal/store"
)

type memoriesResponse struct {
	Memories []store.Memory `json:"memories"`
}

// These are curated, not a transcript dump: an agent writes them deliberately,
// through a tool, when something is worth keeping past the conversation it was
// learned in.
func (s *Server) listMemories(w http.ResponseWriter, r *http.Request) {
	memories, err := s.config.Store.ListMemories(r.Context(), r.PathValue("agentId"), r.PathValue("userId"))
	if err != nil {
		s.fail(w, err, "list memories")

		return
	}

	writeJSON(w, http.StatusOK, memoriesResponse{Memories: memories})
}

type putMemoryRequest struct {
	Value string `json:"value"`
}

// putMemory takes the name from the query rather than the path, because a
// memory's handle may contain slashes.
func (s *Server) putMemory(w http.ResponseWriter, r *http.Request) {
	var request putMemoryRequest
	if !decode(w, r, &request) {
		return
	}

	// No embedding here either: this is on the agent's critical path, inside a
	// tool call the person is waiting through. The backfill picks it up.
	memory := store.Memory{Name: r.URL.Query().Get("name"), Value: request.Value}

	version, err := s.config.Store.PutMemory(r.Context(), r.PathValue("agentId"), r.PathValue("userId"),
		memory, expectedVersion(r))
	if err != nil {
		s.fail(w, err, "put memory")

		return
	}

	w.Header().Set(versionHeader, strconv.FormatInt(version, 10))
	w.WriteHeader(http.StatusOK)
}

func (s *Server) deleteMemory(w http.ResponseWriter, r *http.Request) {
	err := s.config.Store.DeleteMemory(r.Context(), r.PathValue("agentId"), r.PathValue("userId"),
		r.URL.Query().Get("name"))
	if err != nil {
		s.fail(w, err, "delete memory")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type searchRequest struct {
	UserID    string `json:"userId"`
	ThreadKey string `json:"threadKey"`
	Text      string `json:"text"`
	Scope     string `json:"scope"`
	Limit     int    `json:"limit"`
}

type searchResponse struct {
	Hits []store.Hit `json:"hits"`
}

// searchMemory ranks by embedding similarity when we have embeddings and by
// text matching when we do not — both are valid, and discovery says which, so a
// UI can tell a person what kind of search they got.
func (s *Server) searchMemory(w http.ResponseWriter, r *http.Request) {
	var request searchRequest
	if !decode(w, r, &request) {
		return
	}

	query := store.Query{
		AgentID:   r.PathValue("agentId"),
		UserID:    request.UserID,
		ThreadKey: request.ThreadKey,
		Text:      request.Text,
		Scope:     request.Scope,
		Limit:     request.Limit,
	}

	// Search DOES embed inline: it is a read somebody is waiting on, and the
	// contract gives this one route a longer timeout for exactly that reason.
	if vectors, err := s.config.Embedder.Embed(r.Context(), []string{request.Text}); err == nil && len(vectors) > 0 {
		query.Vector = vectors[0]
	}

	hits, err := s.config.Store.Search(r.Context(), query)
	if err != nil {
		s.fail(w, err, "search memory")

		return
	}

	writeJSON(w, http.StatusOK, searchResponse{Hits: hits})
}
