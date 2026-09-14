// Package bus is the message half of the platform API, on Redis Streams.
//
// Streams rather than lists, because the mapping is almost one-to-one: a
// consumer group is a competing-consumer group, the pending-entries list is the
// unacknowledged set, and XREADGROUP's BLOCK is the long poll the contract
// asks for — so "answer 204 only after the window expires" falls out of the
// primitive instead of being simulated on top of one.
package bus

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	queuePrefix   = "journal:q:"
	topicPrefix   = "journal:t:"
	delayedSuffix = ":delayed"
	// payloadField is the single stream field every entry carries. One field,
	// because the message is opaque JSON and splitting it would mean parsing it.
	payloadField = "m"
	// maxLen bounds a stream so an unread subject cannot grow without limit.
	// Approximate, which is what lets Redis trim on whole nodes.
	maxLen = 10_000
	// promoteBatch bounds how many held-back messages one receive puts back, so
	// a burst coming due at once cannot stretch the poll past its window.
	promoteBatch = 64
	idBytes      = 16
)

// ErrNoSubscription is a poll or an ack against a subscription that was removed
// or expired. The contract answers 404 for it, unlike everything else here.
var ErrNoSubscription = errors.New("no such subscription")

// Delivery is one message plus the handle needed to settle it. DeliveryID
// identifies THIS delivery, not the message: a redelivery carries a new one.
type Delivery struct {
	DeliveryID string          `json:"deliveryId"`
	ReplyTo    string          `json:"replyTo,omitempty"`
	Message    json.RawMessage `json:"message"`
}

// Bus is publish and long-poll over both planes.
type Bus interface {
	Publish(ctx context.Context, subject string, message json.RawMessage) error
	Receive(ctx context.Context, subject, group string, max int, wait time.Duration) ([]Delivery, error)
	Ack(ctx context.Context, subject string, ids []string) error
	Nack(ctx context.Context, subject string, ids []string, delay time.Duration) error

	PublishTopic(ctx context.Context, subject string, message json.RawMessage) error
	Subscribe(ctx context.Context, subject, subscriber string) (string, error)
	ReceiveTopic(ctx context.Context, subject, subscription string, max int, wait time.Duration) ([]Delivery, error)
	AckTopic(ctx context.Context, subject, subscription string, ids []string) error
	Unsubscribe(ctx context.Context, subject, subscription string) error
}

// RedisBus is the shipped implementation. `consumer` names this replica inside
// every consumer group: a stable name rather than a fresh one per poll, so the
// groups do not accumulate one dead consumer per request.
type RedisBus struct {
	client       redis.UniversalClient
	consumer     string
	ackDeadline  time.Duration
	trimApproxTo int64
}

func NewRedisBus(client redis.UniversalClient, consumer string, ackDeadline time.Duration) *RedisBus {
	return &RedisBus{
		client:       client,
		consumer:     consumer,
		ackDeadline:  ackDeadline,
		trimApproxTo: maxLen,
	}
}

func newID() string {
	ret := make([]byte, idBytes)
	_, _ = rand.Read(ret)

	return hex.EncodeToString(ret)
}

func (b *RedisBus) add(ctx context.Context, key string, message json.RawMessage) error {
	return b.client.XAdd(ctx, &redis.XAddArgs{
		Stream: key,
		MaxLen: b.trimApproxTo,
		Approx: true,
		Values: map[string]any{payloadField: string(message)},
	}).Err()
}

// ensureGroup creates the consumer group if it is not there yet. `start` is 0
// for a queue — a message published before any consumer existed is still that
// consumer's to handle — and $ for a topic subscription, which wants what is
// published from now on and not the whole history.
func (b *RedisBus) ensureGroup(ctx context.Context, key, group, start string) error {
	err := b.client.XGroupCreateMkStream(ctx, key, group, start).Err()
	if err != nil && strings.Contains(err.Error(), "BUSYGROUP") {
		return nil
	}

	return err
}

// groupSeparator joins a stream entry id to the group it was handed to. A
// delivery id is opaque to the runtime, and the settle routes carry no group of
// their own — so the handle has to carry it, or an ack lands on whichever group
// the request headers happened to suggest.
//
// `@` is safe as the separator because a Redis entry id is `<ms>-<seq>` and
// never contains one.
const groupSeparator = "@"

func handleFor(group, entryID string) string {
	return entryID + groupSeparator + group
}

// splitHandle recovers the entry id and the group. A handle from an older
// build, or from anywhere else, has no group — the caller decides what to do
// with it, which for a settle is nothing: the contract says an id we do not
// recognise is not worth an error.
func splitHandle(handle string) (string, string) {
	entryID, group, found := strings.Cut(handle, groupSeparator)

	if !found {
		return handle, ""
	}

	return entryID, group
}

// byGroup buckets handles by the group they were delivered under, so one settle
// request covering two groups still acknowledges each in its own.
func byGroup(handles []string) map[string][]string {
	ret := make(map[string][]string)

	for _, handle := range handles {
		entryID, group := splitHandle(handle)
		ret[group] = append(ret[group], entryID)
	}

	return ret
}

// deliveriesFrom turns what a read returned into deliveries. An entry missing
// its payload field is skipped rather than delivered empty: it can only come
// from something other than us writing to the stream.
func deliveriesFrom(group string, streams []redis.XStream) []Delivery {
	var ret []Delivery

	for _, stream := range streams {
		for _, message := range stream.Messages {
			payload, ok := message.Values[payloadField].(string)
			if !ok {
				continue
			}

			ret = append(ret, Delivery{
				DeliveryID: handleFor(group, message.ID),
				Message:    json.RawMessage(payload),
			})
		}
	}

	return ret
}
