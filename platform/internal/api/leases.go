package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/eetr-ai/journal/platform/internal/locks"
)

type acquireLeaseRequest struct {
	Name       string `json:"name"`
	Holder     string `json:"holder"`
	TTLSeconds int64  `json:"ttlSeconds"`
}

type claimResponse struct {
	Acquired  bool   `json:"acquired"`
	LeaseID   string `json:"leaseId,omitempty"`
	Holder    string `json:"holder,omitempty"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

// acquireLease answers now, always. It must never block waiting for a holder to
// finish: a caller that cannot have the name goes and does something else with
// the message it is holding. "Somebody else has it" is a 200 with acquired
// false — an expected answer, not an error worth logging as one.
func (s *Server) acquireLease(w http.ResponseWriter, r *http.Request) {
	var request acquireLeaseRequest
	if !decode(w, r, &request) {
		return
	}

	ttl, ok := ttlFrom(request.TTLSeconds, leaseMinTTLSeconds, leaseMaxTTLSeconds)

	if !ok {
		badTTL(w)

		return
	}

	claim, err := s.config.Locks.Acquire(r.Context(), request.Name, request.Holder, ttl)
	if err != nil {
		s.fail(w, err, "lease acquire")

		return
	}

	writeJSON(w, http.StatusOK, claimFrom(claim))
}

func claimFrom(claim locks.Claim) claimResponse {
	ret := claimResponse{Acquired: claim.Acquired, LeaseID: claim.LeaseID, Holder: claim.Holder}

	if !claim.ExpiresAt.IsZero() {
		ret.ExpiresAt = claim.ExpiresAt.UTC().Format(time.RFC3339)
	}

	return ret
}

type ttlRequest struct {
	TTLSeconds int64 `json:"ttlSeconds"`
}

// renewLease answers 409 when the claim is no longer this holder's, which the
// runtime reads as definitive and gives the claim up at once. Any other failure
// it treats as transient and retries — so the distinction matters.
func (s *Server) renewLease(w http.ResponseWriter, r *http.Request) {
	var request ttlRequest
	if !decode(w, r, &request) {
		return
	}

	ttl, ok := ttlFrom(request.TTLSeconds, leaseMinTTLSeconds, leaseMaxTTLSeconds)

	if !ok {
		badTTL(w)

		return
	}

	err := s.config.Locks.Renew(r.Context(), r.PathValue("leaseId"), ttl)

	if errors.Is(err, locks.ErrNotHeld) {
		w.WriteHeader(http.StatusConflict)

		return
	}

	if err != nil {
		s.fail(w, err, "lease renew")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) releaseLease(w http.ResponseWriter, r *http.Request) {
	if err := s.config.Locks.Release(r.Context(), r.PathValue("leaseId")); err != nil {
		s.fail(w, err, "lease release")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
