package api

import (
	"net/http"
	"time"
)

type campaignRequest struct {
	Holder     string `json:"holder"`
	TTLSeconds int64  `json:"ttlSeconds"`
}

type campaignResponse struct {
	Leader        bool   `json:"leader"`
	LeaseID       string `json:"leaseId,omitempty"`
	CurrentLeader string `json:"currentLeader,omitempty"`
	ExpiresAt     string `json:"expiresAt,omitempty"`
}

// campaign serves both the first claim and every renewal, because to a
// stateless server they are the same question: "I claim this key; do I hold
// it?" The runtime calls it on a loop, and the answer is granted when the key is
// free, when the holder's TTL has expired, or when the caller is the holder.
func (s *Server) campaign(w http.ResponseWriter, r *http.Request) {
	var request campaignRequest
	if !decode(w, r, &request) {
		return
	}

	ttl, ok := ttlFrom(request.TTLSeconds, leaseMinTTLSeconds, leaseMaxTTLSeconds)

	if !ok {
		badTTL(w)

		return
	}

	claim, err := s.config.Locks.Campaign(r.Context(), r.PathValue("key"), request.Holder, ttl)
	if err != nil {
		s.fail(w, err, "campaign")

		return
	}

	ret := campaignResponse{Leader: claim.Acquired, LeaseID: claim.LeaseID}

	if !claim.Acquired {
		ret.CurrentLeader = claim.Holder
	}

	if !claim.ExpiresAt.IsZero() {
		ret.ExpiresAt = claim.ExpiresAt.UTC().Format(time.RFC3339)
	}

	writeJSON(w, http.StatusOK, ret)
}

type resignRequest struct {
	LeaseID string `json:"leaseId"`
}

func (s *Server) resign(w http.ResponseWriter, r *http.Request) {
	var request resignRequest
	if !decode(w, r, &request) {
		return
	}

	if err := s.config.Locks.Resign(r.Context(), r.PathValue("key"), request.LeaseID); err != nil {
		s.fail(w, err, "resign")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
