package api

import (
	"io"
	"net/http"
	"strconv"
)

// The namespace is routed on by name and nothing else. The six the runtime
// sends today are system, user, and the _secrets and _volatile variants; a
// platform that gains a tier must not need this contract to change, so there is
// deliberately no enum here to reject the seventh.
func (s *Server) getEntry(w http.ResponseWriter, r *http.Request) {
	entry, err := s.config.Store.GetEntry(r.Context(), r.PathValue("namespace"), r.URL.Query().Get("key"))
	if err != nil {
		s.fail(w, err, "kv get")

		return
	}

	w.Header().Set(versionHeader, strconv.FormatInt(entry.Version, 10))
	w.Header().Set("content-type", "application/octet-stream")
	_, _ = w.Write(entry.Value)
}

func (s *Server) putEntry(w http.ResponseWriter, r *http.Request) {
	value, err := io.ReadAll(io.LimitReader(r.Body, maxValueBytes+1))
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "the body could not be read")

		return
	}

	if len(value) > maxValueBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "too_large", "the value is larger than discovery promised")

		return
	}

	expected, ok := expectedVersion(r)

	if !ok {
		badVersion(w)

		return
	}

	version, err := s.config.Store.PutEntry(r.Context(), r.PathValue("namespace"),
		r.URL.Query().Get("key"), value, expected)
	if err != nil {
		s.fail(w, err, "kv put")

		return
	}

	w.Header().Set(versionHeader, strconv.FormatInt(version, 10))
	w.WriteHeader(http.StatusOK)
}

// deleteEntry answers 204 whether or not there was anything there: the caller
// asked for the name to be gone and it is.
func (s *Server) deleteEntry(w http.ResponseWriter, r *http.Request) {
	expected, ok := expectedVersion(r)

	if !ok {
		badVersion(w)

		return
	}

	err := s.config.Store.DeleteEntry(r.Context(), r.PathValue("namespace"),
		r.URL.Query().Get("key"), expected)
	if err != nil {
		s.fail(w, err, "kv delete")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
