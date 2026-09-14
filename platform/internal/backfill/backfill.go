// Package backfill attaches embeddings to rows that were written without one.
//
// It exists because embedding is slow and recording is not allowed to be. A
// turn is written the moment it completes and picked up here a beat later, so a
// provider having a bad minute costs search a little freshness rather than
// costing a person their transcript. A row that fails is simply still pending,
// so the next pass retries it — there is no dead-letter state to manage.
package backfill

import (
	"context"
	"log/slog"
	"time"

	"github.com/eetr-ai/journal/platform/internal/embed"
	"github.com/eetr-ai/journal/platform/internal/store"
)

const (
	// batch is how many rows one pass embeds. Small enough that a slow provider
	// does not hold the pass open for minutes, large enough to amortize the call.
	batch = 16
	// interval paces the passes when there was nothing to do. After a full batch
	// the next pass runs at once, because there is plainly more waiting.
	interval = 5 * time.Second
	// passTimeout bounds one pass, so a provider that never answers cannot wedge
	// the worker for the life of the process.
	passTimeout = 2 * time.Minute
)

// Worker walks pending rows on a timer.
type Worker struct {
	store    store.Store
	embedder embed.Embedder
	log      *slog.Logger
}

func New(s store.Store, e embed.Embedder, log *slog.Logger) *Worker {
	return &Worker{store: s, embedder: e, log: log}
}

// Run blocks until the context is cancelled. With no embedder configured there
// is nothing to attach, so it returns at once rather than waking up forever to
// find that out.
func (w *Worker) Run(ctx context.Context) {
	if !w.embedder.Semantic() {
		return
	}

	for {
		done, err := w.pass(ctx)
		if err != nil && ctx.Err() == nil {
			w.log.Warn("embedding backfill pass failed", "error", err)
		}

		if done == batch {
			continue
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
		}
	}
}

// pass embeds one batch and returns how many rows it attached a vector to.
func (w *Worker) pass(parent context.Context) (int, error) {
	ctx, cancel := context.WithTimeout(parent, passTimeout)
	defer cancel()

	pending, err := w.store.PendingVectors(ctx, batch)
	if err != nil || len(pending) == 0 {
		return 0, err
	}

	texts := make([]string, len(pending))

	for i, row := range pending {
		texts[i] = row.Text
	}

	vectors, err := w.embedder.Embed(ctx, texts)
	if err != nil {
		return 0, err
	}

	ret := 0

	for i, row := range pending {
		var vector []float32

		if i < len(vectors) {
			vector = vectors[i]
		}

		// Written even when the vector is nil. A row the provider declined is
		// still a row we have considered, and leaving it unmarked would put it
		// at the front of every future pass forever.
		if err := w.store.SetVector(ctx, row, vector); err != nil {
			return ret, err
		}

		ret++
	}

	return ret, nil
}
