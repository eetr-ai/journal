package bus

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

func (b *RedisBus) PublishTopic(ctx context.Context, subject string, message json.RawMessage) error {
	return b.add(ctx, topicPrefix+subject, message)
}

// Subscribe registers one subscriber and gives it its own position in the
// stream — which is what makes fan-out expressible over a pull API, since there
// is no way to say "each of you receives every message" without naming each of
// you. The cursor starts at the end: a new subscriber wants what is published
// from now on, not the whole history.
func (b *RedisBus) Subscribe(ctx context.Context, subject, subscriber string) (string, error) {
	ret := newID()

	if err := b.ensureGroup(ctx, topicPrefix+subject, ret, "$"); err != nil {
		return "", err
	}

	return ret, nil
}

func (b *RedisBus) ReceiveTopic(ctx context.Context, subject, subscription string, max int, wait time.Duration) ([]Delivery, error) {
	// There is no nack on a topic — a handler's error is logged and dropped —
	// but a subscriber that DIED before acking is a different thing, and its
	// delivery would otherwise sit pending forever and never be seen.
	ret, err := b.reclaimTopic(ctx, subject, subscription, max)
	if err != nil {
		return nil, err
	}

	if len(ret) >= max {
		return ret, nil
	}

	streams, err := b.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    subscription,
		Consumer: b.consumer,
		Streams:  []string{topicPrefix + subject, ">"},
		Count:    int64(max - len(ret)),
		Block:    wait,
	}).Result()

	if errors.Is(err, redis.Nil) || errors.Is(err, context.Canceled) ||
		errors.Is(err, context.DeadlineExceeded) {
		return ret, nil
	}

	if err != nil && strings.Contains(err.Error(), "NOGROUP") {
		return nil, ErrNoSubscription
	}
	if err != nil {
		return nil, err
	}

	return append(ret, deliveriesFrom(subscription, streams)...), nil
}

// reclaimTopic takes back deliveries this subscription was handed and never
// settled, once they are older than the ack deadline.
func (b *RedisBus) reclaimTopic(ctx context.Context, subject, subscription string, max int) ([]Delivery, error) {
	messages, _, err := b.client.XAutoClaim(ctx, &redis.XAutoClaimArgs{
		Stream:   topicPrefix + subject,
		Group:    subscription,
		Consumer: b.consumer,
		MinIdle:  b.ackDeadline,
		Start:    "0",
		Count:    int64(max),
	}).Result()

	if err != nil && strings.Contains(err.Error(), "NOGROUP") {
		return nil, ErrNoSubscription
	}

	if err != nil {
		return nil, err
	}

	return deliveriesFrom(subscription, []redis.XStream{{Messages: messages}}), nil
}

// AckTopic advances one subscription's cursor. There is no nack counterpart on
// purpose: a topic handler's error is logged and dropped, so holding a delivery
// back would promise a redelivery nobody will act on.
func (b *RedisBus) AckTopic(ctx context.Context, subject, subscription string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	// The handles carry the subscription they came from; the entry ids are what
	// XACK wants.
	entries := make([]string, len(ids))

	for i, handle := range ids {
		entries[i], _ = splitHandle(handle)
	}

	err := b.client.XAck(ctx, topicPrefix+subject, subscription, entries...).Err()
	if err != nil && strings.Contains(err.Error(), "NOGROUP") {
		return ErrNoSubscription
	}

	return err
}

// Unsubscribe matters more than releasing a queue consumer does: a durable
// cursor left behind by every restart accumulates messages nobody will read.
func (b *RedisBus) Unsubscribe(ctx context.Context, subject, subscription string) error {
	err := b.client.XGroupDestroy(ctx, topicPrefix+subject, subscription).Err()
	if err != nil && strings.Contains(err.Error(), "NOGROUP") {
		return nil
	}

	return err
}
