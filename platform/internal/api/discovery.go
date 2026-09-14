package api

import "net/http"

// feature is one capability block. `Unsupported` only travels when the feature
// is off, and it is what distinguishes a capability that degrades from one that
// refuses.
type feature struct {
	Supported bool   `json:"supported"`
	Reason    string `json:"unsupported,omitempty"`
}

type discovery struct {
	SpecVersion    string `json:"specVersion"`
	Implementation struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"implementation"`
	Features struct {
		KV struct {
			feature
			MaxValueBytes int `json:"maxValueBytes"`
		} `json:"kv"`
		Resources struct {
			feature
		} `json:"resources"`
		Secrets struct {
			feature
			// False, and said out loud. The database is not encrypting these
			// for us, and claiming otherwise would be worse than the gap.
			EncryptedAtRest bool `json:"encryptedAtRest"`
		} `json:"secrets"`
		Leases struct {
			feature
			MinTTLSeconds int `json:"minTtlSeconds"`
			MaxTTLSeconds int `json:"maxTtlSeconds"`
		} `json:"leases"`
		LeaderElection struct {
			feature
			LeaseTTLSeconds        int `json:"leaseTtlSeconds"`
			RenewIntervalSeconds   int `json:"renewIntervalSeconds"`
			ObserveIntervalSeconds int `json:"observeIntervalSeconds"`
		} `json:"leaderElection"`
		Queues struct {
			feature
			// Off: the runtime then refuses a request/reply call up front,
			// naming the flag, which is far kinder than a timeout.
			RequestReply       bool `json:"requestReply"`
			PollTimeoutSeconds int  `json:"pollTimeoutSeconds"`
			MaxBatch           int  `json:"maxBatch"`
			AckDeadlineSeconds int  `json:"ackDeadlineSeconds"`
		} `json:"queues"`
		Topics struct {
			feature
			PollTimeoutSeconds int `json:"pollTimeoutSeconds"`
			MaxBatch           int `json:"maxBatch"`
		} `json:"topics"`
		AgentMemory struct {
			feature
			Semantic          bool `json:"semantic"`
			ListThreads       bool `json:"listThreads"`
			ReadThread        bool `json:"readThread"`
			Search            bool `json:"search"`
			MaxTurnsPerAppend int  `json:"maxTurnsPerAppend"`
		} `json:"agentMemory"`
	} `json:"features"`
}

// getDiscovery is called once, when the runtime starts, and everything else in
// the contract is conditional on it. Resources, traces and logs are left out
// entirely: they degrade on their own, and declaring them would be a promise.
func (s *Server) getDiscovery(w http.ResponseWriter, _ *http.Request) {
	var ret discovery

	ret.SpecVersion = "1.0"
	ret.Implementation.Name = s.config.Name
	ret.Implementation.Version = s.config.Version

	ret.Features.KV.Supported = true
	ret.Features.KV.MaxValueBytes = maxValueBytes

	ret.Features.Resources.Supported = s.config.Resources.Supported()

	ret.Features.Secrets.Supported = true
	ret.Features.Secrets.EncryptedAtRest = s.config.SecretsSealed

	ret.Features.Leases.Supported = true
	ret.Features.Leases.MinTTLSeconds = leaseMinTTLSeconds
	ret.Features.Leases.MaxTTLSeconds = leaseMaxTTLSeconds

	ret.Features.LeaderElection.Supported = true
	ret.Features.LeaderElection.LeaseTTLSeconds = leaderTTLSeconds
	ret.Features.LeaderElection.RenewIntervalSeconds = leaderRenewSeconds
	ret.Features.LeaderElection.ObserveIntervalSeconds = leaderObserveSeconds

	ret.Features.Queues.Supported = true
	ret.Features.Queues.RequestReply = false
	ret.Features.Queues.PollTimeoutSeconds = int(pollCeiling.Seconds())
	ret.Features.Queues.MaxBatch = maxBatch
	ret.Features.Queues.AckDeadlineSeconds = int(ackDeadline.Seconds())

	ret.Features.Topics.Supported = true
	ret.Features.Topics.PollTimeoutSeconds = int(pollCeiling.Seconds())
	ret.Features.Topics.MaxBatch = maxBatch

	ret.Features.AgentMemory.Supported = true
	ret.Features.AgentMemory.Semantic = s.config.Embedder.Semantic()
	ret.Features.AgentMemory.ListThreads = true
	ret.Features.AgentMemory.ReadThread = true
	ret.Features.AgentMemory.Search = true
	ret.Features.AgentMemory.MaxTurnsPerAppend = maxTurnsPerAppend

	writeJSON(w, http.StatusOK, ret)
}
