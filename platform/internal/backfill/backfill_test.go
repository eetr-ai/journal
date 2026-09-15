package backfill_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/eetr-ai/journal/platform/internal/backfill"
	"github.com/eetr-ai/journal/platform/internal/store"
)

// A fake store, because what is worth proving here is the worker's decisions —
// that a row it could not embed is still finished with, and that a provider
// having a bad minute costs freshness rather than the queue.

type fakeStore struct {
	store.Store
	mu      sync.Mutex
	pending []store.Pending
	written map[string][]float32
}

func (f *fakeStore) PendingVectors(_ context.Context, limit int) ([]store.Pending, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if len(f.pending) > limit {
		return f.pending[:limit], nil
	}

	return f.pending, nil
}

func (f *fakeStore) SetVector(_ context.Context, p store.Pending, vector []float32) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.written == nil {
		f.written = map[string][]float32{}
	}

	f.written[p.Text] = vector

	var ret []store.Pending

	for _, row := range f.pending {
		if row.Text != p.Text {
			ret = append(ret, row)
		}
	}

	f.pending = ret

	return nil
}

type fakeEmbedder struct {
	vectors map[string][]float32
	err     error
}

func (f fakeEmbedder) Semantic() bool { return true }

func (f fakeEmbedder) Embed(_ context.Context, texts []string) ([][]float32, error) {
	if f.err != nil {
		return nil, f.err
	}

	ret := make([][]float32, len(texts))

	for i, text := range texts {
		ret[i] = f.vectors[text]
	}

	return ret, nil
}

func quiet() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func drain(t *testing.T, worker *backfill.Worker) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	worker.Run(ctx)
}

// The one the queue depends on: a row the provider declines has to be finished
// with anyway, or it sits at the front of every pass forever and everything
// behind it never gets embedded.
func TestARowTheProviderDeclinesIsStillFinishedWith(t *testing.T) {
	rows := &fakeStore{pending: []store.Pending{
		{Kind: "turn", Text: "declined"},
		{Kind: "turn", Text: "fine"},
	}}

	worker := backfill.New(rows, fakeEmbedder{vectors: map[string][]float32{"fine": {0.1, 0.2}}}, quiet())
	drain(t, worker)

	if len(rows.pending) != 0 {
		t.Fatalf("%d row(s) still pending, so the queue is stuck behind one the provider would not take", len(rows.pending))
	}

	if rows.written["declined"] != nil {
		t.Fatal("a vector was invented for a row the provider declined")
	}

	if len(rows.written["fine"]) != 2 {
		t.Fatal("the row that could be embedded was not")
	}
}

// A provider that is failing must leave the rows pending, so they are retried
// rather than marked done with nothing attached.
func TestAFailingProviderLeavesTheRowsForNextTime(t *testing.T) {
	rows := &fakeStore{pending: []store.Pending{{Kind: "turn", Text: "later"}}}

	worker := backfill.New(rows, fakeEmbedder{err: errors.New("provider is down")}, quiet())
	drain(t, worker)

	if len(rows.pending) != 1 {
		t.Fatal("a row was marked done while the provider was failing")
	}
}

// Nothing to embed means nothing to do, and the worker must not wake up forever
// to find that out.
func TestWithoutAnEmbedderTheWorkerDoesNotRun(t *testing.T) {
	rows := &fakeStore{pending: []store.Pending{{Kind: "turn", Text: "never"}}}

	done := make(chan struct{})

	go func() {
		backfill.New(rows, noopEmbedder{}, quiet()).Run(context.Background())
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("the worker is looping with no embedder configured")
	}

	if len(rows.pending) != 1 {
		t.Fatal("rows were marked done with no embedder to embed them")
	}
}

type noopEmbedder struct{}

func (noopEmbedder) Semantic() bool { return false }

func (noopEmbedder) Embed(_ context.Context, texts []string) ([][]float32, error) {
	return make([][]float32, len(texts)), nil
}

// A store that never runs dry: every pass takes a full batch, so the worker
// never reaches the idle branch.
type endlessStore struct {
	fakeStore
	mu    sync.Mutex
	given int
}

func (e *endlessStore) PendingVectors(_ context.Context, limit int) ([]store.Pending, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.given++

	ret := make([]store.Pending, limit)

	for i := range ret {
		ret[i] = store.Pending{Kind: "turn", Text: "from the sweep"}
	}

	return ret, nil
}

func (e *endlessStore) SetVector(context.Context, store.Pending, []float32) error { return nil }

// An offered row is the only copy: the sweep cannot read a sealed row, so an
// offer that is never taken is a turn that never becomes searchable. A busy
// database must not be able to starve it.
func TestOfferedRowsAreNotStarvedByABusySweep(t *testing.T) {
	rows := &endlessStore{}
	taken := make(chan string, 1)

	worker := backfill.New(rows, takingEmbedder{taken: taken}, quiet())

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	go worker.Run(ctx)

	worker.Offer([]store.Pending{{Kind: "turn", Text: "offered while the sweep is busy"}})

	for {
		select {
		case text := <-taken:
			if text == "offered while the sweep is busy" {
				return
			}
		case <-ctx.Done():
			t.Fatal("the offered row was never embedded, so a busy sweep starves it")
		}
	}
}

// Reports every text it is asked to embed, so a test can watch what the worker
// actually reached for.
type takingEmbedder struct {
	taken chan string
}

func (takingEmbedder) Semantic() bool { return true }

func (e takingEmbedder) Embed(_ context.Context, texts []string) ([][]float32, error) {
	ret := make([][]float32, len(texts))

	for i, text := range texts {
		ret[i] = []float32{0.1}

		select {
		case e.taken <- text:
		default:
		}
	}

	return ret, nil
}
