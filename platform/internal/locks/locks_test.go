package locks_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/eetr-ai/journal/platform/internal/locks"
)

func testLocks(t *testing.T) *locks.RedisLocks {
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

	return locks.NewRedisLocks(client)
}

// "Somebody else holds it" is an ANSWER, not a failure — and the caller is told
// who, for its logs.
func TestOnlyOneHolderAtATime(t *testing.T) {
	ctx := context.Background()
	l := testLocks(t)
	name := "dolphin.exclusive"

	first, err := l.Acquire(ctx, name, "replica-a", 30*time.Second)
	if err != nil || !first.Acquired {
		t.Fatalf("the first claim should win, got %+v (%v)", first, err)
	}

	defer func() { _ = l.Release(ctx, first.LeaseID) }()

	second, err := l.Acquire(ctx, name, "replica-b", 30*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	if second.Acquired {
		t.Fatal("two replicas hold the same name")
	}

	if second.Holder != "replica-a" {
		t.Fatalf("the loser should be told who holds it, got %q", second.Holder)
	}
}

// A holder that died without releasing must not take a name out of service for
// good, which is the entire reason a lease expires.
func TestALapsedClaimIsFreeAgain(t *testing.T) {
	ctx := context.Background()
	l := testLocks(t)
	name := "dolphin.lapsed"

	if _, err := l.Acquire(ctx, name, "replica-gone", time.Second); err != nil {
		t.Fatal(err)
	}

	time.Sleep(1500 * time.Millisecond)

	after, err := l.Acquire(ctx, name, "replica-next", 5*time.Second)
	if err != nil || !after.Acquired {
		t.Fatalf("the name should be free once the TTL passed, got %+v (%v)", after, err)
	}

	_ = l.Release(ctx, after.LeaseID)
}

// The runtime reads a refused renew as definitive and gives the claim up at
// once, so it must not be confused with a transient failure.
func TestRenewingSomebodyElsesClaimIsRefused(t *testing.T) {
	ctx := context.Background()
	l := testLocks(t)
	name := "dolphin.renew"

	claim, err := l.Acquire(ctx, name, "replica-a", 5*time.Second)
	if err != nil || !claim.Acquired {
		t.Fatal(err)
	}

	if err := l.Renew(ctx, claim.LeaseID, 5*time.Second); err != nil {
		t.Fatalf("the holder should be able to renew: %v", err)
	}

	if err := l.Release(ctx, claim.LeaseID); err != nil {
		t.Fatal(err)
	}

	if err := l.Renew(ctx, claim.LeaseID, 5*time.Second); !errors.Is(err, locks.ErrNotHeld) {
		t.Fatalf("renewing a released claim should be refused, got %v", err)
	}
}

// One endpoint serves the first claim and every renewal, because to a stateless
// server they are the same question. So campaigning twice as the same holder
// must succeed twice, and as anyone else must not.
func TestCampaigningIsIdempotentForTheLeader(t *testing.T) {
	ctx := context.Background()
	l := testLocks(t)
	key := "dolphin.leader"

	first, err := l.Campaign(ctx, key, "replica-a", 5*time.Second)
	if err != nil || !first.Acquired {
		t.Fatalf("the first campaign should win, got %+v (%v)", first, err)
	}

	again, err := l.Campaign(ctx, key, "replica-a", 5*time.Second)
	if err != nil || !again.Acquired {
		t.Fatalf("the leader renewing should still lead, got %+v (%v)", again, err)
	}

	other, err := l.Campaign(ctx, key, "replica-b", 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}

	if other.Acquired {
		t.Fatal("two replicas believe they lead the same key")
	}

	if err := l.Resign(ctx, key, first.LeaseID); err != nil {
		t.Fatal(err)
	}

	taken, err := l.Campaign(ctx, key, "replica-b", 5*time.Second)
	if err != nil || !taken.Acquired {
		t.Fatalf("the key should be up for grabs after a resign, got %+v (%v)", taken, err)
	}

	_ = l.Resign(ctx, key, taken.LeaseID)
}
