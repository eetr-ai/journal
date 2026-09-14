package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/eetr-ai/journal/platform/internal/bus"
)

type publishRequest struct {
	Message json.RawMessage `json:"message"`
	System  bool            `json:"system"`
}

type receiveRequest struct {
	ConsumerGroup  string `json:"consumerGroup"`
	SubscriptionID string `json:"subscriptionId"`
	MaxMessages    int    `json:"maxMessages"`
	WaitSeconds    int64  `json:"waitSeconds"`
}

type receiveResponse struct {
	Messages []bus.Delivery `json:"messages"`
}

type settleRequest struct {
	SubscriptionID string   `json:"subscriptionId"`
	DeliveryIDs    []string `json:"deliveryIds"`
	DelaySeconds   int64    `json:"delaySeconds"`
}

// deploymentHeader carries the deployment id, which IS the consumer group when
// the poll does not name one.
const deploymentHeader = "X-Octo-Deployment"

// defaultGroup is what an unscoped deployment competes under. A name rather
// than the empty string, because a Redis consumer group has to have one.
const defaultGroup = "default"

func groupOf(r *http.Request, named string) string {
	if named != "" {
		return named
	}

	if fromHeader := r.Header.Get(deploymentHeader); fromHeader != "" {
		return fromHeader
	}

	return defaultGroup
}

// subjectOf is the decoded subject, decoded exactly once — ServeMux unescapes a
// path value on the way in, so doing it again here would merge `a%2Fb` and
// `a/b` into one subject, which is the bug the contract warns about by name.
func subjectOf(r *http.Request) string {
	return r.PathValue("subject")
}

func (s *Server) publishQueue(w http.ResponseWriter, r *http.Request) {
	var request publishRequest
	if !decode(w, r, &request) {
		return
	}

	if err := s.config.Bus.Publish(r.Context(), subjectOf(r), request.Message); err != nil {
		s.fail(w, err, "queue publish")

		return
	}

	w.WriteHeader(http.StatusAccepted)
}

// receiveQueue holds the request open for the window the caller asked for.
// Answering 204 the moment the queue is empty would turn the runtime's poll
// loop into a busy loop, so the wait is the point of the route.
func (s *Server) receiveQueue(w http.ResponseWriter, r *http.Request) {
	var request receiveRequest
	if !decode(w, r, &request) {
		return
	}

	messages, err := s.config.Bus.Receive(r.Context(), subjectOf(r), groupOf(r, request.ConsumerGroup),
		batchOf(request.MaxMessages), pollFor(request.WaitSeconds))
	if err != nil {
		s.fail(w, err, "queue receive")

		return
	}

	writeDeliveries(w, messages)
}

// writeDeliveries answers 204 for an empty poll. That is the normal state of an
// idle subject, and not something to log.
func writeDeliveries(w http.ResponseWriter, messages []bus.Delivery) {
	if len(messages) == 0 {
		w.WriteHeader(http.StatusNoContent)

		return
	}

	writeJSON(w, http.StatusOK, receiveResponse{Messages: messages})
}

// ackQueue settles deliveries. A delivery id we do not recognise — already
// acked, already expired — is not worth an error.
func (s *Server) ackQueue(w http.ResponseWriter, r *http.Request) {
	var request settleRequest
	if !decode(w, r, &request) {
		return
	}

	// No group here: each delivery handle carries the one it was handed to.
	if err := s.config.Bus.Ack(r.Context(), subjectOf(r), request.DeliveryIDs); err != nil {
		s.fail(w, err, "queue ack")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) nackQueue(w http.ResponseWriter, r *http.Request) {
	var request settleRequest
	if !decode(w, r, &request) {
		return
	}

	err := s.config.Bus.Nack(r.Context(), subjectOf(r), request.DeliveryIDs,
		time.Duration(request.DelaySeconds)*time.Second)
	if err != nil {
		s.fail(w, err, "queue nack")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) publishTopic(w http.ResponseWriter, r *http.Request) {
	var request publishRequest
	if !decode(w, r, &request) {
		return
	}

	// `system` says the subject opted out of deployment scoping. We run one
	// plane, so there is no other one to route it to.
	if err := s.config.Bus.PublishTopic(r.Context(), subjectOf(r), request.Message); err != nil {
		s.fail(w, err, "topic publish")

		return
	}

	w.WriteHeader(http.StatusAccepted)
}

type subscribeRequest struct {
	Subscriber string `json:"subscriber"`
}

type subscribeResponse struct {
	SubscriptionID string `json:"subscriptionId"`
}

func (s *Server) subscribeTopic(w http.ResponseWriter, r *http.Request) {
	var request subscribeRequest
	if !decode(w, r, &request) {
		return
	}

	id, err := s.config.Bus.Subscribe(r.Context(), subjectOf(r), request.Subscriber)
	if err != nil {
		s.fail(w, err, "topic subscribe")

		return
	}

	writeJSON(w, http.StatusCreated, subscribeResponse{SubscriptionID: id})
}

func (s *Server) receiveTopic(w http.ResponseWriter, r *http.Request) {
	var request receiveRequest
	if !decode(w, r, &request) {
		return
	}

	messages, err := s.config.Bus.ReceiveTopic(r.Context(), subjectOf(r), request.SubscriptionID,
		batchOf(request.MaxMessages), pollFor(request.WaitSeconds))

	if errors.Is(err, bus.ErrNoSubscription) {
		w.WriteHeader(http.StatusNotFound)

		return
	}

	if err != nil {
		s.fail(w, err, "topic receive")

		return
	}

	writeDeliveries(w, messages)
}

func (s *Server) ackTopic(w http.ResponseWriter, r *http.Request) {
	var request settleRequest
	if !decode(w, r, &request) {
		return
	}

	err := s.config.Bus.AckTopic(r.Context(), subjectOf(r), request.SubscriptionID, request.DeliveryIDs)
	if err != nil && !errors.Is(err, bus.ErrNoSubscription) {
		s.fail(w, err, "topic ack")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) unsubscribeTopic(w http.ResponseWriter, r *http.Request) {
	err := s.config.Bus.Unsubscribe(r.Context(), subjectOf(r), r.PathValue("subscriptionId"))
	if err != nil {
		s.fail(w, err, "topic unsubscribe")

		return
	}

	w.WriteHeader(http.StatusNoContent)
}
