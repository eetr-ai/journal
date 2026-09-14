package store

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PgStore is the shipped implementation of Store.
type PgStore struct {
	pool *pgxpool.Pool
}

// NewPgStore connects and verifies the connection before returning, so a bad
// DSN is a startup failure rather than a 500 on the first agent turn.
func NewPgStore(ctx context.Context, dsn string) (*PgStore, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres unreachable: %w", err)
	}

	return &PgStore{pool: pool}, nil
}

func (s *PgStore) Close() {
	s.pool.Close()
}

// stamp renders a time the way the contract wants it, and an unset time as the
// empty string so `omitempty` can drop the field.
func stamp(t time.Time) string {
	if t.IsZero() {
		return ""
	}

	return t.UTC().Format(time.RFC3339)
}

// vectorLiteral is pgvector's text input format. nil rather than a literal for
// an absent vector, so the column stays NULL and the row is simply never a
// similarity hit.
func vectorLiteral(v []float32) any {
	if len(v) == 0 {
		return nil
	}

	var ret strings.Builder
	ret.WriteByte('[')

	for i, f := range v {
		if i > 0 {
			ret.WriteByte(',')
		}
		ret.WriteString(strconv.FormatFloat(float64(f), 'f', -1, 32))
	}

	ret.WriteByte(']')

	return ret.String()
}

func (s *PgStore) GetEntry(ctx context.Context, namespace, key string) (Entry, error) {
	var ret Entry

	err := s.pool.QueryRow(ctx,
		`SELECT value, version FROM platform_kv WHERE namespace = $1 AND key = $2`,
		namespace, key,
	).Scan(&ret.Value, &ret.Version)

	if errors.Is(err, pgx.ErrNoRows) {
		return Entry{}, ErrMissing
	}

	return ret, err
}

// PutEntry writes under an optimistic-concurrency check. `expected` of 0 means
// create and must lose against an existing row; a positive value must equal the
// stored version. Both arms are one statement, so two writers racing cannot
// both win — the second one's WHERE simply matches nothing.
func (s *PgStore) PutEntry(ctx context.Context, namespace, key string, value []byte, expected int64) (int64, error) {
	if expected == 0 {
		var ret int64

		err := s.pool.QueryRow(ctx,
			`INSERT INTO platform_kv (namespace, key, value, version)
			 VALUES ($1, $2, $3, 1)
			 ON CONFLICT DO NOTHING
			 RETURNING version`,
			namespace, key, value,
		).Scan(&ret)

		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrConflict
		}

		return ret, err
	}

	var ret int64

	err := s.pool.QueryRow(ctx,
		`UPDATE platform_kv SET value = $3, version = version + 1, updated_at = now()
		 WHERE namespace = $1 AND key = $2 AND version = $4
		 RETURNING version`,
		namespace, key, value, expected,
	).Scan(&ret)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrConflict
	}

	return ret, err
}

// DeleteEntry removes the key. `expected` of 0 deletes unconditionally: there
// is no create to conflict with, and a caller that wants a name gone does not
// always know what version it was at.
func (s *PgStore) DeleteEntry(ctx context.Context, namespace, key string, expected int64) error {
	if expected == 0 {
		_, err := s.pool.Exec(ctx,
			`DELETE FROM platform_kv WHERE namespace = $1 AND key = $2`, namespace, key)

		return err
	}

	tag, err := s.pool.Exec(ctx,
		`DELETE FROM platform_kv WHERE namespace = $1 AND key = $2 AND version = $3`,
		namespace, key, expected)
	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrConflict
	}

	return nil
}
