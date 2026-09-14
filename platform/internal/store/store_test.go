package store_test

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/eetr-ai/journal/platform/internal/seal"
	"github.com/eetr-ai/journal/platform/internal/store"
)

// These run against a real Postgres holding sql/001_schema.sql and
// sql/002_chat.sql. Faking the database would only assert the fake: what is
// worth proving is that the statements do what the contract says they do.
//
// Set TEST_POSTGRES_DSN to run them. Each test owns names nothing else touches,
// so they can share one database.
func testStore(t *testing.T) *store.PgStore {
	t.Helper()

	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN is not set")
	}

	ret, err := store.NewPgStore(context.Background(), dsn)
	if err != nil {
		t.Fatalf("could not reach the test database: %v", err)
	}

	t.Cleanup(ret.Close)

	return ret
}

// Version 0 means create, and the contract is emphatic that getting this wrong
// does not fail loudly — it silently loses concurrent updates. So each arm is
// checked, including the one that must lose.
func TestEntryVersionRules(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	// Each test owns its keys and starts from nothing, so a re-run is the same
	// run. Version 0 means create, and a leftover row would make it conflict.
	_ = s.DeleteEntry(ctx, "user", "rules/first", 0)

	version, err := s.PutEntry(ctx, "user", "rules/first", []byte("one"), 0)
	if err != nil || version != 1 {
		t.Fatalf("a create should answer version 1, got %d (%v)", version, err)
	}

	if _, err := s.PutEntry(ctx, "user", "rules/first", []byte("again"), 0); !errors.Is(err, store.ErrConflict) {
		t.Fatalf("a create over an existing key should conflict, got %v", err)
	}

	if _, err := s.PutEntry(ctx, "user", "rules/first", []byte("stale"), 7); !errors.Is(err, store.ErrConflict) {
		t.Fatalf("a stale version should conflict, got %v", err)
	}

	version, err = s.PutEntry(ctx, "user", "rules/first", []byte("two"), 1)
	if err != nil || version != 2 {
		t.Fatalf("a matching version should answer the new one, got %d (%v)", version, err)
	}

	entry, err := s.GetEntry(ctx, "user", "rules/first")
	if err != nil || string(entry.Value) != "two" || entry.Version != 2 {
		t.Fatalf("the read should see the write, got %q at %d (%v)", entry.Value, entry.Version, err)
	}
}

// A namespace is routed on by name and nothing else, so the same key in two
// namespaces is two objects. This is what keeps secrets from colliding with
// ordinary storage.
func TestNamespacesDoNotCollide(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	_ = s.DeleteEntry(ctx, "user", "shared/key", 0)
	_ = s.DeleteEntry(ctx, "user_secrets", "shared/key", 0)

	if _, err := s.PutEntry(ctx, "user", "shared/key", []byte("ordinary"), 0); err != nil {
		t.Fatal(err)
	}

	if _, err := s.PutEntry(ctx, "user_secrets", "shared/key", []byte("secret"), 0); err != nil {
		t.Fatalf("the same key in another namespace should be a different object: %v", err)
	}

	entry, err := s.GetEntry(ctx, "user", "shared/key")
	if err != nil || string(entry.Value) != "ordinary" {
		t.Fatalf("got %q (%v)", entry.Value, err)
	}
}

func TestMissingEntryIsAMiss(t *testing.T) {
	if _, err := testStore(t).GetEntry(context.Background(), "user", "nothing/here"); !errors.Is(err, store.ErrMissing) {
		t.Fatalf("an absent key should be a miss rather than a failure, got %v", err)
	}
}

// Appends commute, and the whole reason there is no version check on them is
// that two writers should interleave rather than collide. That only holds if
// seq is assigned under a lock, so this hammers it concurrently and then checks
// the record is dense — no gaps, no duplicates.
func TestSeqIsDenseUnderConcurrentAppends(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	const writers = 8
	const each = 5

	thread := "dolphin-dense"
	_ = s.DeleteThread(ctx, "test", thread)

	var wg sync.WaitGroup

	for w := range writers {
		wg.Add(1)

		go func(w int) {
			defer wg.Done()

			for i := range each {
				turns := []store.Turn{{Role: "user", Text: fmt.Sprintf("w%d-%d", w, i)}}

				if _, _, err := s.AppendTurns(ctx, "test", thread, "dolphin-person", turns); err != nil {
					t.Errorf("append failed: %v", err)

					return
				}
			}
		}(w)
	}

	wg.Wait()

	_, turns, _, err := s.ReadThread(ctx, "test", thread, "", writers*each+1)
	if err != nil {
		t.Fatal(err)
	}

	if len(turns) != writers*each {
		t.Fatalf("expected %d turns, got %d", writers*each, len(turns))
	}

	for i, turn := range turns {
		if turn.Seq != int64(i+1) {
			t.Fatalf("turn %d has seq %d: the record has a gap or a duplicate", i, turn.Seq)
		}
	}
}

// Saving working memory CREATES the conversation when it is new, which is why a
// 404 has no innocent reading on that route.
func TestSaveWorkingCreatesTheConversation(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	thread := "dolphin-working"
	_ = s.DeleteThread(ctx, "test", thread)

	if _, err := s.LoadWorking(ctx, "test", thread); !errors.Is(err, store.ErrMissing) {
		t.Fatalf("a conversation that has not started should be a miss, got %v", err)
	}

	version, err := s.SaveWorking(ctx, "test", thread, "dolphin-person",
		store.Working{Value: []byte("opaque"), Iteration: 3, Tokens: 42}, 0)
	if err != nil || version != 1 {
		t.Fatalf("the create should answer version 1, got %d (%v)", version, err)
	}

	if _, err := s.SaveWorking(ctx, "test", thread, "", store.Working{Value: []byte("x")}, 0); !errors.Is(err, store.ErrConflict) {
		t.Fatalf("a second create should conflict, got %v", err)
	}

	working, err := s.LoadWorking(ctx, "test", thread)
	if err != nil || string(working.Value) != "opaque" || working.Iteration != 3 || working.Tokens != 42 {
		t.Fatalf("the counters should survive the round trip, got %+v (%v)", working, err)
	}
}

// The userId is recorded on the first write that names one. Ignoring it stores a
// complete history attributed to nobody, and a person's own view of their
// conversations then shows as empty — so a later write with no userId must not
// wipe it either.
func TestUserIsRecordedOnceAndKept(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	thread := "dolphin-attributed"
	_ = s.DeleteThread(ctx, "test", thread)

	if _, _, err := s.AppendTurns(ctx, "test", thread, "dolphin-owner", []store.Turn{{Role: "user", Text: "hello"}}); err != nil {
		t.Fatal(err)
	}

	if _, err := s.SaveWorking(ctx, "test", thread, "", store.Working{Value: []byte("later")}, 0); err != nil {
		t.Fatal(err)
	}

	threads, _, err := s.ListThreads(ctx, "test", "dolphin-owner", "", 10)
	if err != nil {
		t.Fatal(err)
	}

	for _, found := range threads {
		if found.ThreadKey == thread {
			return
		}
	}

	t.Fatal("the conversation lost its owner, so nobody can see it any more")
}

// Erasure is the one operation that must not report false success.
func TestDeleteThreadTakesTheTurnsWithIt(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	thread := "dolphin-erased"
	_ = s.DeleteThread(ctx, "test", thread)

	if _, _, err := s.AppendTurns(ctx, "test", thread, "dolphin-person", []store.Turn{{Role: "user", Text: "remember this"}}); err != nil {
		t.Fatal(err)
	}

	if err := s.DeleteThread(ctx, "test", thread); err != nil {
		t.Fatal(err)
	}

	if _, _, _, err := s.ReadThread(ctx, "test", thread, "", 10); !errors.Is(err, store.ErrMissing) {
		t.Fatalf("the conversation should be gone, got %v", err)
	}

	hits, err := s.Search(ctx, store.Query{AgentID: "test", ThreadKey: thread, Text: "remember this"})
	if err != nil {
		t.Fatal(err)
	}

	if len(hits) != 0 {
		t.Fatalf("the turns outlived the conversation they belonged to: %d still findable", len(hits))
	}
}

// With no embedder configured there is no vector, and search has to degrade to
// text matching rather than returning nothing. That is what makes a local run
// with no account work at all.
func TestSearchFallsBackToText(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	thread := "dolphin-search"
	_ = s.DeleteThread(ctx, "test", thread)

	_, _, err := s.AppendTurns(ctx, "test", thread, "dolphin-seeker", []store.Turn{
		{Role: "user", Text: "the bouldering plateau is a variety problem"},
		{Role: "assistant", Text: "two rest days is what most people under-do"},
	})
	if err != nil {
		t.Fatal(err)
	}

	hits, err := s.Search(ctx, store.Query{AgentID: "test", UserID: "dolphin-seeker", Text: "plateau", Scope: "turns"})
	if err != nil {
		t.Fatal(err)
	}

	if len(hits) != 1 || hits[0].Kind != "turn" {
		t.Fatalf("expected one turn hit, got %+v", hits)
	}
}

// The secrets namespaces are sealed and the ordinary ones are not, and the
// difference has to be visible in the database rather than only in the API: a
// dump is exactly the thing this protects against.
func TestOnlySecretsNamespacesAreSealed(t *testing.T) {
	ctx := context.Background()
	inner := testStore(t)

	sealer, err := seal.New(base64.StdEncoding.EncodeToString(make([]byte, seal.KeyBytes)))
	if err != nil {
		t.Fatal(err)
	}

	sealed := store.NewSealed(inner, sealer)

	_ = inner.DeleteEntry(ctx, "user_secrets", "dolphin/token", 0)
	_ = inner.DeleteEntry(ctx, "user", "dolphin/plain", 0)

	if _, err := sealed.PutEntry(ctx, "user_secrets", "dolphin/token", []byte("hunter2"), 0); err != nil {
		t.Fatal(err)
	}

	if _, err := sealed.PutEntry(ctx, "user", "dolphin/plain", []byte("hunter2"), 0); err != nil {
		t.Fatal(err)
	}

	// Through the decorator, both read back as what was written.
	opened, err := sealed.GetEntry(ctx, "user_secrets", "dolphin/token")
	if err != nil || string(opened.Value) != "hunter2" {
		t.Fatalf("the secret did not survive the round trip: %q (%v)", opened.Value, err)
	}

	// Underneath it, only the ordinary one is readable.
	raw, err := inner.GetEntry(ctx, "user_secrets", "dolphin/token")
	if err != nil {
		t.Fatal(err)
	}

	if string(raw.Value) == "hunter2" {
		t.Fatal("the secret is sitting in the database in the clear")
	}

	rawPlain, err := inner.GetEntry(ctx, "user", "dolphin/plain")
	if err != nil || string(rawPlain.Value) != "hunter2" {
		t.Fatalf("an ordinary value should not be sealed, got %q (%v)", rawPlain.Value, err)
	}
}

// A positive version is a claim that a conversation is already there. Taking it
// on an absent row would let a writer holding a stale version bring back a
// conversation somebody erased.
func TestAStaleVersionCannotResurrectAnErasedConversation(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	thread := "dolphin-resurrect"
	_ = s.DeleteThread(ctx, "test", thread)

	if _, err := s.SaveWorking(ctx, "test", thread, "dolphin-person", store.Working{Value: []byte("one")}, 0); err != nil {
		t.Fatal(err)
	}

	if err := s.DeleteThread(ctx, "test", thread); err != nil {
		t.Fatal(err)
	}

	if _, err := s.SaveWorking(ctx, "test", thread, "dolphin-person", store.Working{Value: []byte("back")}, 1); !errors.Is(err, store.ErrConflict) {
		t.Fatalf("an erased conversation came back from a stale version: %v", err)
	}

	if _, err := s.LoadWorking(ctx, "test", thread); !errors.Is(err, store.ErrMissing) {
		t.Fatal("the conversation is there again")
	}
}

// The listing pages on (last_activity_at, thread_key), so the cursor has to
// carry the same precision the column does — several conversations active in
// one second would otherwise share a cursor and the page after them would skip
// all of them.
func TestPagingDoesNotSkipConversationsFromTheSameInstant(t *testing.T) {
	ctx := context.Background()
	s := testStore(t)

	const count = 5

	for i := range count {
		thread := fmt.Sprintf("dolphin-page-%d", i)
		_ = s.DeleteThread(ctx, "paging", thread)

		if _, _, err := s.AppendTurns(ctx, "paging", thread, "dolphin-pager",
			[]store.Turn{{Role: "user", Text: "x"}}); err != nil {
			t.Fatal(err)
		}
	}

	seen := map[string]bool{}
	cursor := ""

	for range count {
		page, next, err := s.ListThreads(ctx, "paging", "dolphin-pager", cursor, 2)
		if err != nil {
			t.Fatal(err)
		}

		for _, thread := range page {
			seen[thread.ThreadKey] = true
		}

		if next == "" {
			break
		}

		cursor = next
	}

	if len(seen) != count {
		t.Fatalf("paging saw %d of %d conversations, so a page boundary skipped some", len(seen), count)
	}
}
