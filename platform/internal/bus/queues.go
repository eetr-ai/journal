package bus

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

func (b *RedisBus) Publish(ctx context.Context, subject string, message json.RawMessage) error {
	return b.add(ctx, queuePrefix+subject, message)
}

// Receive holds the request open for `wait` and answers with nothing when it
// expires, which is the normal state of an idle subject. Three things happen
// first, in this order: anything whose nack delay has come due goes back on the
// stream, anything a dead replica was holding past the ack deadline is taken
// back, and only then does the poll block.
func (b *RedisBus) Receive(ctx context.Context, subject, group string, max int, wait time.Duration) ([]Delivery, error) {
	key := queuePrefix + subject

	if err := b.ensureGroup(ctx, key, group, "0"); err != nil {
		return nil, err
	}

	if err := b.promoteDelayed(ctx, key); err != nil {
		return nil, err
	}

	ret, err := b.reclaim(ctx, key, group, max)
	if err != nil {
		return nil, err
	}

	if len(ret) >= max {
		return ret, nil
	}

	streams, err := b.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    group,
		Consumer: b.consumer,
		Streams:  []string{key, ">"},
		Count:    int64(max - len(ret)),
		Block:    wait,
	}).Result()

	// The poll expiring is redis.Nil, and it is the expected answer rather than
	// a failure. So is a cancelled context: the caller hung up.
	if errors.Is(err, redis.Nil) || errors.Is(err, context.Canceled) ||
		errors.Is(err, context.DeadlineExceeded) {
		return ret, nil
	}
	if err != nil {
		return nil, err
	}

	return append(ret, deliveriesFrom(streams)...), nil
}

// reclaim takes back deliveries idle longer than the ack deadline. This is what
// makes delivery at-least-once: a replica that died mid-handler does not
// swallow the message.
func (b *RedisBus) reclaim(ctx context.Context, key, group string, max int) ([]Delivery, error) {
	messages, _, err := b.client.XAutoClaim(ctx, &redis.XAutoClaimArgs{
		Stream:   key,
		Group:    group,
		Consumer: b.consumer,
		MinIdle:  b.ackDeadline,
		Start:    "0",
		Count:    int64(max),
	}).Result()
	if err != nil {
		return nil, err
	}

	return deliveriesFrom([]redis.XStream{{Messages: messages}}), nil
}

func (b *RedisBus) Ack(ctx context.Context, subject, group string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	key := queuePrefix + subject

	if err := b.client.XAck(ctx, key, group, ids...).Err(); err != nil {
		return err
	}

	// Acked entries are nobody's any more, and leaving them in the stream only
	// makes the trim do the work later.
	return b.client.XDel(ctx, key, ids...).Err()
}

// Nack holds the message back for `delay` and then puts it on the stream again.
// Honouring the delay is the whole point: without it a message whose handler
// fails every time is redelivered as fast as the network allows, and one poison
// message becomes a hot loop against us and against whatever the handler could
// not reach.
func (b *RedisBus) Nack(ctx context.Context, subject, group string, ids []string, delay time.Duration) error {
	key := queuePrefix + subject

	for _, id := range ids {
		payload, err := b.payloadOf(ctx, key, id)
		if err != nil {
			return err
		}

		if payload == "" {
			continue
		}

		if delay <= 0 {
			if err := b.add(ctx, key, json.RawMessage(payload)); err != nil {
				return err
			}

			continue
		}

		due := float64(time.Now().Add(delay).UnixMilli())

		// The member is unique per nack, so two deliveries of the same message
		// held back at once do not collapse into one.
		if err := b.client.ZAdd(ctx, key+delayedSuffix, redis.Z{
			Score:  due,
			Member: newID() + "\x00" + payload,
		}).Err(); err != nil {
			return err
		}
	}

	return b.Ack(ctx, subject, group, ids)
}

func (b *RedisBus) payloadOf(ctx context.Context, key, id string) (string, error) {
	entries, err := b.client.XRange(ctx, key, id, id).Result()
	if err != nil || len(entries) == 0 {
		return "", err
	}

	payload, _ := entries[0].Values[payloadField].(string)

	return payload, nil
}

// promoteDelayed puts back everything whose delay has come due. It runs on the
// receive path rather than on a timer: the only thing that cares is a poll, and
// a sweeper nobody is waiting on is a goroutine that can quietly stop.
func (b *RedisBus) promoteDelayed(ctx context.Context, key string) error {
	now := strconv.FormatInt(time.Now().UnixMilli(), 10)

	due, err := b.client.ZRangeByScore(ctx, key+delayedSuffix, &redis.ZRangeBy{
		Min: "-inf",
		Max: now,
	}).Result()
	if err != nil || len(due) == 0 {
		return err
	}

	for _, member := range due {
		_, payload, found := cutAtNul(member)
		if !found {
			continue
		}

		if err := b.add(ctx, key, json.RawMessage(payload)); err != nil {
			return err
		}
	}

	return b.client.ZRem(ctx, key+delayedSuffix, toAny(due)...).Err()
}

func cutAtNul(member string) (string, string, bool) {
	for i := range member {
		if member[i] == 0 {
			return member[:i], member[i+1:], true
		}
	}

	return "", "", false
}

func toAny(values []string) []any {
	ret := make([]any, len(values))

	for i, v := range values {
		ret[i] = v
	}

	return ret
}
