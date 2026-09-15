package store_test

import (
	"context"
	"encoding/base64"
	"strings"
	"testing"

	"github.com/eetr-ai/journal/platform/internal/seal"
	"github.com/eetr-ai/journal/platform/internal/store"
)

// A fake rather than Postgres, because what is under test is what reaches the
// database — and the only way to see that is to be the database.
type recorder struct {
	store.Store
	turns   []store.Turn
	working []byte
	title   string
	memory  store.Memory
	read    []store.Turn
	hits    []store.Hit
	deleted string
}

func (r *recorder) AppendTurns(_ context.Context, _, _, _ string, turns []store.Turn) (int64, []int64, error) {
	r.turns = turns

	return 1, []int64{7, 8}[:len(turns)], nil
}

func (r *recorder) SaveWorking(_ context.Context, _, _, _ string, w store.Working, _ int64) (int64, error) {
	r.working = w.Value

	return 1, nil
}

func (r *recorder) LoadWorking(context.Context, string, string) (store.Working, error) {
	return store.Working{Value: r.working}, nil
}

func (r *recorder) SetTitle(_ context.Context, _, _, _, title string) error {
	r.title = title

	return nil
}

func (r *recorder) ReadThread(context.Context, string, string, string, int) (store.Thread, []store.Turn, string, error) {
	return store.Thread{Title: r.title}, r.read, "", nil
}

func (r *recorder) PutMemory(_ context.Context, _, _ string, m store.Memory, _ int64) (int64, error) {
	r.memory = m

	return 3, nil
}

func (r *recorder) Search(context.Context, store.Query) ([]store.Hit, error) {
	return r.hits, nil
}

func (r *recorder) ListMemories(context.Context, string, string) ([]store.Memory, error) {
	return []store.Memory{r.memory}, nil
}

func (r *recorder) DeleteMemory(_ context.Context, _, _, name string) error {
	r.deleted = name

	return nil
}

type offered struct{ rows []store.Pending }

func (o *offered) Offer(rows []store.Pending) { o.rows = append(o.rows, rows...) }

const aKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="

func privateOver(t *testing.T, inner store.Store, v store.Vectors) *store.Private {
	t.Helper()

	sealer, err := seal.New(aKey)
	if err != nil {
		t.Fatal(err)
	}

	return store.NewPrivate(inner, sealer, v)
}

// The point of the whole mechanism: what lands in the database is not what the
// person said. Asserting on the absence of the words rather than on the
// presence of a prefix, because a prefix can be right while the value is not.
func TestTurnsReachTheDatabaseSealed(t *testing.T) {
	inner := &recorder{}
	sink := &offered{}
	ctx := context.Background()

	_, seqs, err := privateOver(t, inner, sink).AppendTurns(ctx, "journal", "t1", "who",
		[]store.Turn{{Role: "user", Text: "I am afraid of the surgery"}})
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(inner.turns[0].Text, "surgery") {
		t.Fatalf("the words reached the database: %q", inner.turns[0].Text)
	}

	if !store.IsSealed(inner.turns[0].Text) {
		t.Fatalf("stored value does not say it is sealed: %q", inner.turns[0].Text)
	}

	// The vector has to come from here, because nothing downstream can read it.
	if len(sink.rows) != 1 || sink.rows[0].Text != "I am afraid of the surgery" {
		t.Fatalf("offered %v", sink.rows)
	}

	if sink.rows[0].Seq != seqs[0] {
		t.Fatalf("offered seq %d, row was written at %d", sink.rows[0].Seq, seqs[0])
	}
}

func TestReadingBackReturnsTheWords(t *testing.T) {
	inner := &recorder{}
	ctx := context.Background()
	private := privateOver(t, inner, &offered{})

	if _, _, err := private.AppendTurns(ctx, "journal", "t1", "who",
		[]store.Turn{{Role: "user", Text: "the words"}}); err != nil {
		t.Fatal(err)
	}

	if err := private.SetTitle(ctx, "journal", "t1", "who", "A hard week"); err != nil {
		t.Fatal(err)
	}

	inner.read = inner.turns

	thread, turns, _, err := private.ReadThread(ctx, "journal", "t1", "", 0)
	if err != nil {
		t.Fatal(err)
	}

	if turns[0].Text != "the words" || thread.Title != "A hard week" {
		t.Fatalf("read back %q / %q", turns[0].Text, thread.Title)
	}
}

func TestWorkingMemoryRoundTrips(t *testing.T) {
	inner := &recorder{}
	ctx := context.Background()
	private := privateOver(t, inner, &offered{})

	if _, err := private.SaveWorking(ctx, "journal", "t1", "who",
		store.Working{Value: []byte("serialized context")}, 0); err != nil {
		t.Fatal(err)
	}

	if strings.Contains(string(inner.working), "serialized") {
		t.Fatal("working memory reached the database in the clear")
	}

	ret, err := private.LoadWorking(ctx, "journal", "t1")
	if err != nil {
		t.Fatal(err)
	}

	if string(ret.Value) != "serialized context" {
		t.Fatalf("loaded %q", ret.Value)
	}
}

// A row written before there was a key, or by a run that forwarded none, still
// has to read. Self-describing values are what make that possible.
func TestPlaintextRowsStillRead(t *testing.T) {
	inner := &recorder{read: []store.Turn{{Text: "written before there was a key"}}, title: "old title"}

	_, turns, _, err := privateOver(t, inner, &offered{}).ReadThread(context.Background(), "a", "b", "", 0)
	if err != nil {
		t.Fatal(err)
	}

	if turns[0].Text != "written before there was a key" {
		t.Fatalf("read %q", turns[0].Text)
	}
}

// The failure that matters: answering with nothing here would let a
// conversation resume from a blank history and then overwrite it.
func TestTheWrongKeyIsAnError(t *testing.T) {
	inner := &recorder{}
	ctx := context.Background()

	if _, _, err := privateOver(t, inner, &offered{}).AppendTurns(ctx, "a", "b", "c",
		[]store.Turn{{Text: "something"}}); err != nil {
		t.Fatal(err)
	}

	inner.read = inner.turns
	other := base64.StdEncoding.EncodeToString([]byte("fedcba9876543210fedcba9876543210"))

	sealer, err := seal.New(other)
	if err != nil {
		t.Fatal(err)
	}

	if _, _, _, err := store.NewPrivate(inner, sealer, &offered{}).
		ReadThread(ctx, "a", "b", "", 0); err == nil {
		t.Fatal("a value sealed under another key must not read as empty")
	}
}

// Both halves of a fact are sealed. The name has to be, because a fact called
// "toca-el-bajo" says most of what the fact says.
func TestBothHalvesOfAFactAreSealed(t *testing.T) {
	inner := &recorder{}
	sink := &offered{}

	_, err := privateOver(t, inner, sink).PutMemory(context.Background(), "journal", "who",
		store.Memory{Name: "toca-el-bajo", Value: "plays bass in a band"}, 0)
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(inner.memory.Name, "bajo") {
		t.Fatalf("the name reached the database: %q", inner.memory.Name)
	}

	if strings.Contains(inner.memory.Value, "bass") {
		t.Fatalf("the value reached the database: %q", inner.memory.Value)
	}

	// The vector still comes from the words, and the offer has to name the row
	// the way the column holds it.
	if len(sink.rows) != 1 || sink.rows[0].Text != "plays bass in a band" {
		t.Fatalf("offered %v", sink.rows)
	}

	if sink.rows[0].Name != inner.memory.Name || sink.rows[0].Version != 3 {
		t.Fatalf("offered a row the write-back cannot find: %v", sink.rows[0])
	}
}

// The property the primary key depends on: remembering the same fact twice has
// to address one row, not two.
func TestRememberingTheSameFactTwiceIsOneRow(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})
	ctx := context.Background()

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "religion", Value: "buddhism"}, 0); err != nil {
		t.Fatal(err)
	}

	first := inner.memory.Name

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "religion", Value: "stoicism, mostly"}, 1); err != nil {
		t.Fatal(err)
	}

	if inner.memory.Name != first {
		t.Fatal("the same name sealed to two different rows")
	}

}

// The name is stable and the value beside it must not be. Stability is bought
// for the one field that needs it, and nowhere else: two rows holding the same
// answer should not be visibly the same answer.
func TestTheValueIsNotStable(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})
	ctx := context.Background()

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "religion", Value: "buddhism"}, 0); err != nil {
		t.Fatal(err)
	}

	first := inner.memory.Value

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "religion", Value: "buddhism"}, 1); err != nil {
		t.Fatal(err)
	}

	if inner.memory.Value == first {
		t.Fatal("the same answer sealed to the same bytes twice")
	}
}

func TestADifferentFactIsADifferentRow(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})
	ctx := context.Background()

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "religion", Value: "x"}, 0); err != nil {
		t.Fatal(err)
	}

	first := inner.memory.Name

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "philosophy", Value: "x"}, 0); err != nil {
		t.Fatal(err)
	}

	if inner.memory.Name == first {
		t.Fatal("two names collided onto one row")
	}
}

// Reading gives the agent back the name it wrote, so nothing above the store
// learns that any of this happened.
func TestFactNamesComeBackOpened(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})
	ctx := context.Background()

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "toca-el-bajo", Value: "plays bass"}, 0); err != nil {
		t.Fatal(err)
	}

	facts, err := private.ListMemories(ctx, "journal", "who")
	if err != nil {
		t.Fatal(err)
	}

	if facts[0].Name != "toca-el-bajo" || facts[0].Value != "plays bass" {
		t.Fatalf("read back %q / %q", facts[0].Name, facts[0].Value)
	}
}

// Forgetting has to reach the row remembering wrote.
func TestForgettingAddressesTheSameRow(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})
	ctx := context.Background()

	if _, err := private.PutMemory(ctx, "journal", "who",
		store.Memory{Name: "toca-el-bajo", Value: "plays bass"}, 0); err != nil {
		t.Fatal(err)
	}

	if err := private.DeleteMemory(ctx, "journal", "who", "toca-el-bajo"); err != nil {
		t.Fatal(err)
	}

	if inner.deleted != inner.memory.Name {
		t.Fatalf("delete addressed %q, the row is at %q", inner.deleted, inner.memory.Name)
	}
}

func TestSearchHitsAreOpened(t *testing.T) {
	inner := &recorder{}
	private := privateOver(t, inner, &offered{})

	if err := private.SetTitle(context.Background(), "a", "b", "c", "a found thing"); err != nil {
		t.Fatal(err)
	}

	inner.hits = []store.Hit{{Text: inner.title}}

	hits, err := private.Search(context.Background(), store.Query{})
	if err != nil {
		t.Fatal(err)
	}

	if hits[0].Text != "a found thing" {
		t.Fatalf("search returned %q", hits[0].Text)
	}
}
