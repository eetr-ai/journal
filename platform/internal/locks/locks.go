// Package locks is the exclusive-claim half of the platform API, on Redis:
// leases, which a flow takes by name, and leader election, which a replica
// campaigns for. Nothing here is durable — a claim that outlives its holder is
// a bug, which is what the TTLs are for.
package locks

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	leasePrefix  = "journal:lease:"
	handlePrefix = "journal:lease-id:"
	leaderPrefix = "journal:leader:"
	idBytes      = 16
)

// Claim is the answer to a claim or a campaign. Acquired false is an ANSWER,
// not a failure: the caller goes and does something else with its message.
type Claim struct {
	Acquired  bool
	LeaseID   string
	Holder    string
	ExpiresAt time.Time
}

// Locks is the exclusive-claim surface. One implementation ships, on Redis.
type Locks interface {
	Acquire(ctx context.Context, name, holder string, ttl time.Duration) (Claim, error)
	Renew(ctx context.Context, leaseID string, ttl time.Duration) error
	Release(ctx context.Context, leaseID string) error
	Campaign(ctx context.Context, key, holder string, ttl time.Duration) (Claim, error)
	Resign(ctx context.Context, key, leaseID string) error
}

// ErrNotHeld is a renew or a release for a claim that is no longer the
// caller's. The runtime reads it as definitive and gives the claim up at once,
// which is why it must not be conflated with a transient failure.
var ErrNotHeld = errors.New("claim is not held by this caller")

type RedisLocks struct {
	client redis.UniversalClient
}

func NewRedisLocks(client redis.UniversalClient) *RedisLocks {
	return &RedisLocks{client: client}
}

func newID() string {
	ret := make([]byte, idBytes)
	_, _ = rand.Read(ret)

	return hex.EncodeToString(ret)
}

// Acquire grants the name when it is free, or when the previous holder's TTL
// passed without a renewal. A holder that died without releasing must not take
// a name out of service for good, which is exactly what the expiry buys.
func (l *RedisLocks) Acquire(ctx context.Context, name, holder string, ttl time.Duration) (Claim, error) {
	id := newID()
	key := leasePrefix + name

	won, err := l.client.SetNX(ctx, key, id+"|"+holder, ttl).Result()
	if err != nil {
		return Claim{}, err
	}

	if !won {
		current, err := l.client.Get(ctx, key).Result()
		if errors.Is(err, redis.Nil) {
			// It lapsed between the SETNX and the GET. Saying "held by
			// nobody" is honest; the caller retries on its own schedule.
			return Claim{}, nil
		}

		_, holder, _ := strings.Cut(current, "|")

		return Claim{Holder: holder}, err
	}

	// The reverse key is what lets renew and release name the claim without the
	// caller having to repeat which name it took.
	if err := l.client.Set(ctx, handlePrefix+id, name, ttl).Err(); err != nil {
		return Claim{}, err
	}

	return Claim{Acquired: true, LeaseID: id, Holder: holder, ExpiresAt: time.Now().Add(ttl)}, nil
}

// renewScript extends both keys only if the claim is still this lease's.
var renewScript = redis.NewScript(`
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if string.sub(current, 1, string.len(ARGV[1])) ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[2])
return 1
`)

func (l *RedisLocks) Renew(ctx context.Context, leaseID string, ttl time.Duration) error {
	name, err := l.client.Get(ctx, handlePrefix+leaseID).Result()
	if errors.Is(err, redis.Nil) {
		return ErrNotHeld
	}
	if err != nil {
		return err
	}

	held, err := renewScript.Run(ctx, l.client,
		[]string{leasePrefix + name, handlePrefix + leaseID},
		leaseID+"|", ttl.Milliseconds()).Int()
	if err != nil {
		return err
	}

	if held == 0 {
		return ErrNotHeld
	}

	return nil
}

var releaseScript = redis.NewScript(`
local current = redis.call('GET', KEYS[1])
if current and string.sub(current, 1, string.len(ARGV[1])) == ARGV[1] then
  redis.call('DEL', KEYS[1])
end
redis.call('DEL', KEYS[2])
return 1
`)

// Release is best-effort: the runtime has already stopped treating the claim as
// held, so a failure here only means the name waits out its TTL.
func (l *RedisLocks) Release(ctx context.Context, leaseID string) error {
	name, err := l.client.Get(ctx, handlePrefix+leaseID).Result()
	if errors.Is(err, redis.Nil) {
		return nil
	}
	if err != nil {
		return err
	}

	return releaseScript.Run(ctx, l.client,
		[]string{leasePrefix + name, handlePrefix + leaseID}, leaseID+"|").Err()
}

// campaignScript grants the key when it is free, when the previous holder's TTL
// has expired, or when the caller is already the holder — which is why one
// endpoint serves both the first claim and every renewal.
var campaignScript = redis.NewScript(`
local current = redis.call('GET', KEYS[1])
if not current or current == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
  return 1
end
return 0
`)

func (l *RedisLocks) Campaign(ctx context.Context, key, holder string, ttl time.Duration) (Claim, error) {
	won, err := campaignScript.Run(ctx, l.client,
		[]string{leaderPrefix + key}, holder, ttl.Milliseconds()).Int()
	if err != nil {
		return Claim{}, err
	}

	if won == 0 {
		current, err := l.client.Get(ctx, leaderPrefix+key).Result()
		if errors.Is(err, redis.Nil) {
			return Claim{}, nil
		}

		return Claim{Holder: current}, err
	}

	// The holder IS the lease id here: a campaign is idempotent for one holder,
	// so there is nothing extra to identify.
	return Claim{Acquired: true, LeaseID: holder, Holder: holder, ExpiresAt: time.Now().Add(ttl)}, nil
}

var resignScript = redis.NewScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`)

func (l *RedisLocks) Resign(ctx context.Context, key, leaseID string) error {
	if err := resignScript.Run(ctx, l.client, []string{leaderPrefix + key}, leaseID).Err(); err != nil {
		return fmt.Errorf("resign %s: %w", key, err)
	}

	return nil
}
