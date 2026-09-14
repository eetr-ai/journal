package bus_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/eetr-ai/journal/platform/internal/bus"
)

// Against a real Redis, because every interesting property here — the long
// poll, the pending-entries list, the delayed redelivery — is the primitive's
// behaviour and not ours. Set TEST_REDIS_URL to run them.
func testBus(t *testing.T, ackDeadline time.Duration) *bus.RedisBus {
	t.Helper()

	url := os.Getenv("TEST_REDIS_URL")
	if url == "" {
		t.Skip("TEST_REDIS_URL is not set")
	}

	options, err := redis.ParseURL(url)
	if err != nil {
		t.Fatal(err)
	}

	client := redis.NewClient(options)

	if err := client.Ping(context.Background()).Err(); err != nil {
		t.Fatalf("could not reach the test Redis: %v", err)
	}

	t.Cleanup(func() { _ = client.Close() })

	return bus.NewRedisBus(client, "test-consumer", ackDeadline)
}

func message(text string) json.RawMessage {
	return json.RawMessage(`{"eventId":"` + text + `","body":{"text":"` + text + `"}}`)
}

func TestAMessagePublishedIsAMessageReceived(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)
	subject := "dolphin.publish"

	if err := b.Publish(ctx, subject, message("one")); err != nil {
		t.Fatal(err)
	}

	got, err := b.Receive(ctx, subject, "dolphin-group", 8, time.Second)
	if err != nil || len(got) != 1 {
		t.Fatalf("expected one delivery, got %d (%v)", len(got), err)
	}

	if string(got[0].Message) != string(message("one")) {
		t.Fatalf("the message did not cross whole: %s", got[0].Message)
	}

	if err := b.Ack(ctx, subject, []string{got[0].DeliveryID}); err != nil {
		t.Fatal(err)
	}
}

// The contract is emphatic about this one: answering immediately when the queue
// is empty turns the runtime's poll loop into a busy loop. So the wait has to
// be real, which means the call has to take about as long as it was asked for.
func TestAnIdlePollWaitsOutItsWindow(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)

	const window = 700 * time.Millisecond

	started := time.Now()

	got, err := b.Receive(ctx, "dolphin.idle", "dolphin-group", 8, window)
	if err != nil {
		t.Fatal(err)
	}

	if len(got) != 0 {
		t.Fatalf("an idle subject should deliver nothing, got %d", len(got))
	}

	// Half the window is generous enough to survive a slow machine and still
	// fail an implementation that answered straight away.
	if elapsed := time.Since(started); elapsed < window/2 {
		t.Fatalf("the poll came back after %v, which is a busy loop waiting to happen", elapsed)
	}
}

// At-least-once: a replica that dies mid-handler must not swallow the message.
func TestAnUnackedMessageComesBack(t *testing.T) {
	ctx := context.Background()

	const deadline = 300 * time.Millisecond

	b := testBus(t, deadline)
	subject := "dolphin.reclaim"
	group := "dolphin-reclaim-group"

	if err := b.Publish(ctx, subject, message("unhandled")); err != nil {
		t.Fatal(err)
	}

	first, err := b.Receive(ctx, subject, group, 8, time.Second)
	if err != nil || len(first) != 1 {
		t.Fatalf("expected one delivery, got %d (%v)", len(first), err)
	}

	// The handler "dies" here: nothing is acked.
	time.Sleep(deadline * 2)

	again, err := b.Receive(ctx, subject, group, 8, time.Second)
	if err != nil || len(again) != 1 {
		t.Fatalf("the message should have been reclaimed, got %d (%v)", len(again), err)
	}

	if err := b.Ack(ctx, subject, []string{again[0].DeliveryID}); err != nil {
		t.Fatal(err)
	}
}

// Honouring the nack delay is what keeps one poison message from becoming a hot
// loop, so the message must NOT be there before the delay is up, and must be
// there after.
func TestANackedMessageWaitsOutItsDelay(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)
	subject := "dolphin.nack"
	group := "dolphin-nack-group"

	if err := b.Publish(ctx, subject, message("poison")); err != nil {
		t.Fatal(err)
	}

	got, err := b.Receive(ctx, subject, group, 8, time.Second)
	if err != nil || len(got) != 1 {
		t.Fatalf("expected one delivery, got %d (%v)", len(got), err)
	}

	const delay = 2 * time.Second

	if err := b.Nack(ctx, subject, []string{got[0].DeliveryID}, delay); err != nil {
		t.Fatal(err)
	}

	early, err := b.Receive(ctx, subject, group, 8, 300*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}

	if len(early) != 0 {
		t.Fatalf("the message came back before its delay was up: that is the hot loop")
	}

	time.Sleep(delay)

	late, err := b.Receive(ctx, subject, group, 8, time.Second)
	if err != nil || len(late) != 1 {
		t.Fatalf("the message should have come back after its delay, got %d (%v)", len(late), err)
	}

	if err := b.Ack(ctx, subject, []string{late[0].DeliveryID}); err != nil {
		t.Fatal(err)
	}
}

// A queue is point-to-point and a topic is fan-out, and the difference is the
// whole reason there are two planes. Two consumer groups on a queue also each
// see every message, which is what lets two deployments consume independently.
func TestEverySubscriptionSeesEveryTopicMessage(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)
	subject := "dolphin.broadcast"

	first, err := b.Subscribe(ctx, subject, "replica-a")
	if err != nil {
		t.Fatal(err)
	}

	second, err := b.Subscribe(ctx, subject, "replica-b")
	if err != nil {
		t.Fatal(err)
	}

	if err := b.PublishTopic(ctx, subject, message("everyone")); err != nil {
		t.Fatal(err)
	}

	for _, subscription := range []string{first, second} {
		got, err := b.ReceiveTopic(ctx, subject, subscription, 8, time.Second)
		if err != nil || len(got) != 1 {
			t.Fatalf("subscription %s got %d messages (%v)", subscription, len(got), err)
		}
	}

	if err := b.Unsubscribe(ctx, subject, first); err != nil {
		t.Fatal(err)
	}

	if _, err := b.ReceiveTopic(ctx, subject, first, 8, time.Second); !errors.Is(err, bus.ErrNoSubscription) {
		t.Fatalf("polling a removed subscription should say so, got %v", err)
	}

	_ = b.Unsubscribe(ctx, subject, second)
}

// A new subscriber wants what is published from now on, not the whole history.
func TestANewSubscriptionStartsAtTheEnd(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)
	subject := "dolphin.history"

	if err := b.PublishTopic(ctx, subject, message("before")); err != nil {
		t.Fatal(err)
	}

	subscription, err := b.Subscribe(ctx, subject, "latecomer")
	if err != nil {
		t.Fatal(err)
	}

	defer func() { _ = b.Unsubscribe(ctx, subject, subscription) }()

	got, err := b.ReceiveTopic(ctx, subject, subscription, 8, 300*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}

	if len(got) != 0 {
		t.Fatalf("a new subscriber received %d message(s) published before it existed", len(got))
	}
}

// Two deployments on one subject each see every message, and one settling must
// not take the message out from under the other — which is what deleting the
// stream entry on ack did.
//
// The order matters: the second group reads AFTER the first has acked, which is
// the case a delete destroys and a delete-free ack survives.
func TestOneGroupSettlingDoesNotRobTheOther(t *testing.T) {
	ctx := context.Background()
	b := testBus(t, time.Minute)
	subject := "dolphin.two-groups"

	// Both groups exist from before the publish, so neither is starting its
	// cursor past it.
	for _, group := range []string{"deployment-a", "deployment-b"} {
		if _, err := b.Receive(ctx, subject, group, 8, 200*time.Millisecond); err != nil {
			t.Fatal(err)
		}
	}

	if err := b.Publish(ctx, subject, message("both")); err != nil {
		t.Fatal(err)
	}

	first, err := b.Receive(ctx, subject, "deployment-a", 8, time.Second)
	if err != nil || len(first) != 1 {
		t.Fatalf("deployment-a got %d messages (%v)", len(first), err)
	}

	if err := b.Ack(ctx, subject, []string{first[0].DeliveryID}); err != nil {
		t.Fatal(err)
	}

	second, err := b.Receive(ctx, subject, "deployment-b", 8, time.Second)
	if err != nil || len(second) != 1 {
		t.Fatalf("deployment-b lost the message when deployment-a settled it (%d, %v)", len(second), err)
	}

	if err := b.Ack(ctx, subject, []string{second[0].DeliveryID}); err != nil {
		t.Fatal(err)
	}

	again, err := b.Receive(ctx, subject, "deployment-b", 8, 300*time.Millisecond)
	if err != nil || len(again) != 0 {
		t.Fatalf("a settled message came back (%d, %v)", len(again), err)
	}
}
