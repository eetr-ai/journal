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
	streams, err := b.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    subscription,
		Consumer: b.consumer,
		Streams:  []string{topicPrefix + subject, ">"},
		Count:    int64(max),
		Block:    wait,
	}).Result()

	if errors.Is(err, redis.Nil) || errors.Is(err, context.Canceled) ||
		errors.Is(err, context.DeadlineExceeded) {
		return nil, nil
	}

	if err != nil && strings.Contains(err.Error(), "NOGROUP") {
		return nil, ErrNoSubscription
	}
	if err != nil {
		return nil, err
	}

	return deliveriesFrom(streams), nil
}

// AckTopic advances one subscription's cursor. There is no nack counterpart on
// purpose: a topic handler's error is logged and dropped, so holding a delivery
// back would promise a redelivery nobody will act on.
func (b *RedisBus) AckTopic(ctx context.Context, subject, subscription string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	err := b.client.XAck(ctx, topicPrefix+subject, subscription, ids...).Err()
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
