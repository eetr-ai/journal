// Package store is everything this sidecar keeps in Postgres: octo's key/value
// entries, and what an agent remembers.
//
// TEXT IS STORED IN THE CLEAR HERE, ON PURPOSE AND TEMPORARILY. octo writes
// agent memory on its own behalf, so no block in a flow ever sees it and there
// is nothing to seal it with — https://github.com/juancavallotti/octo/issues/504.
package store

import (
	"context"
	"errors"
)

// ErrConflict is the optimistic-concurrency failure: the version a caller
// believed was current is not. Every write can return it; the API turns it into
// a 409 and the runtime re-reads.
var ErrConflict = errors.New("version conflict")

// ErrMissing is an object that is not there. It is a MISS rather than a failure
// — the API answers 404 and the runtime carries on with nothing.
var ErrMissing = errors.New("no such object")

// Entry is one key/value object and the version it is at.
type Entry struct {
	Value   []byte
	Version int64
}

// Working is an agent's live context for one conversation, opaque to us.
type Working struct {
	Value     []byte
	Version   int64
	Iteration int
	Tokens    int
}

// Turn is one entry in the durable conversation record. Seq and CreatedAt are
// assigned on append, here, because the append is the event.
type Turn struct {
	Seq       int64     `json:"seq"`
	Role      string    `json:"role"`
	Text      string    `json:"text"`
	Tokens    int       `json:"tokens,omitempty"`
	Attrs     []byte    `json:"attrs,omitempty"`
	CreatedAt string    `json:"createdAt,omitempty"`
	Embedding []float32 `json:"-"`
}

// Thread is a conversation's metadata — enough to list conversations without
// reading any of them.
type Thread struct {
	AgentID        string `json:"agentId"`
	ThreadKey      string `json:"threadKey"`
	UserID         string `json:"userId,omitempty"`
	Title          string `json:"title,omitempty"`
	Version        int64  `json:"version"`
	TurnCount      int    `json:"turnCount"`
	CreatedAt      string `json:"createdAt,omitempty"`
	LastActivityAt string `json:"lastActivityAt,omitempty"`
}

// Memory is one curated fact an agent chose to keep about a person.
type Memory struct {
	Name      string    `json:"name"`
	Value     string    `json:"value"`
	Version   int64     `json:"version"`
	CreatedAt string    `json:"createdAt,omitempty"`
	UpdatedAt string    `json:"updatedAt,omitempty"`
	Embedding []float32 `json:"-"`
}

// Hit is one search result. Kind says which of the two stores it came out of,
// since the fields that matter differ.
type Hit struct {
	Kind      string  `json:"kind"`
	ThreadKey string  `json:"threadKey,omitempty"`
	Name      string  `json:"name,omitempty"`
	Text      string  `json:"text"`
	Seq       int64   `json:"seq,omitempty"`
	Score     float64 `json:"score"`
}

// Query narrows a search. An empty Scope searches both stores; a nil Vector
// falls back to text matching, which is what makes an unconfigured embedder a
// degradation rather than a failure.
type Query struct {
	AgentID   string
	UserID    string
	ThreadKey string
	Text      string
	Scope     string
	Limit     int
	Vector    []float32
}

// Store is the persistence this sidecar is built on. One implementation ships,
// PgStore; the interface is here so the API layer can be tested against a fake
// rather than against a database.
type Store interface {
	GetEntry(ctx context.Context, namespace, key string) (Entry, error)
	PutEntry(ctx context.Context, namespace, key string, value []byte, expected int64) (int64, error)
	DeleteEntry(ctx context.Context, namespace, key string, expected int64) error

	LoadWorking(ctx context.Context, agentID, threadKey string) (Working, error)
	SaveWorking(ctx context.Context, agentID, threadKey, userID string, w Working, expected int64) (int64, error)
	AppendTurns(ctx context.Context, agentID, threadKey, userID string, turns []Turn) (int64, error)
	ListThreads(ctx context.Context, agentID, userID, cursor string, limit int) ([]Thread, string, error)
	ReadThread(ctx context.Context, agentID, threadKey, cursor string, limit int) (Thread, []Turn, string, error)
	DeleteThread(ctx context.Context, agentID, threadKey string) error
	SetTitle(ctx context.Context, agentID, threadKey, userID, title string) error

	ListMemories(ctx context.Context, agentID, userID string) ([]Memory, error)
	PutMemory(ctx context.Context, agentID, userID string, m Memory, expected int64) (int64, error)
	DeleteMemory(ctx context.Context, agentID, userID, name string) error

	Search(ctx context.Context, q Query) ([]Hit, error)

	PendingVectors(ctx context.Context, limit int) ([]Pending, error)
	SetVector(ctx context.Context, p Pending, vector []float32) error
}
