package store

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// defaultPage is what a listing returns when the caller names no limit.
const defaultPage = 50

func (s *PgStore) LoadWorking(ctx context.Context, agentID, threadKey string) (Working, error) {
	var ret Working

	err := s.pool.QueryRow(ctx,
		`SELECT working, working_version, iteration, tokens
		 FROM agent_thread WHERE agent_id = $1 AND thread_key = $2`,
		agentID, threadKey,
	).Scan(&ret.Value, &ret.Version, &ret.Iteration, &ret.Tokens)

	if errors.Is(err, pgx.ErrNoRows) || (err == nil && ret.Value == nil) {
		// A conversation row with no context yet reads the same as no
		// conversation: resume from nothing.
		return Working{}, ErrMissing
	}

	return ret, err
}

// SaveWorking stores the live context and creates the conversation when it is
// new, which is why a 404 has no innocent reading on this path. `userID` is
// recorded the first time one is named and never overwritten with an empty one.
func (s *PgStore) SaveWorking(ctx context.Context, agentID, threadKey, userID string, w Working, expected int64) (int64, error) {
	var ret int64

	// A positive expected version is a claim that something is already there.
	// Without this the insert arm would take it, and a writer holding a stale
	// version could bring an erased conversation back at version 1.
	if expected > 0 {
		return s.updateWorking(ctx, agentID, threadKey, w, expected)
	}

	err := s.pool.QueryRow(ctx,
		`INSERT INTO agent_thread (
		   agent_id, thread_key, oidc_subject, working, working_version, iteration, tokens, last_activity_at
		 )
		 VALUES ($1, $2, $3, $4, 1, $5, $6, now())
		 ON CONFLICT (agent_id, thread_key) DO UPDATE SET
		   oidc_subject     = CASE WHEN agent_thread.oidc_subject = '' THEN EXCLUDED.oidc_subject ELSE agent_thread.oidc_subject END,
		   working          = EXCLUDED.working,
		   working_version  = agent_thread.working_version + 1,
		   iteration        = EXCLUDED.iteration,
		   tokens           = EXCLUDED.tokens,
		   last_activity_at = now()
		 WHERE agent_thread.working_version = 0
		 RETURNING working_version`,
		agentID, threadKey, userID, w.Value, w.Iteration, w.Tokens,
	).Scan(&ret)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrConflict
	}

	return ret, err
}

// updateWorking is the arm that refuses to create. A row that is not there
// cannot be at the version the caller believes it is.
func (s *PgStore) updateWorking(ctx context.Context, agentID, threadKey string, w Working, expected int64) (int64, error) {
	var ret int64

	err := s.pool.QueryRow(ctx,
		`UPDATE agent_thread SET
		   working          = $3,
		   working_version  = working_version + 1,
		   iteration        = $4,
		   tokens           = $5,
		   last_activity_at = now()
		 WHERE agent_id = $1 AND thread_key = $2 AND working_version = $6
		 RETURNING working_version`,
		agentID, threadKey, w.Value, w.Iteration, w.Tokens, expected,
	).Scan(&ret)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrConflict
	}

	return ret, err
}

// AppendTurns adds to the durable record and assigns each turn its seq. The
// conversation row is locked for the length of it, so two writers interleave
// rather than minting the same seq twice.
func (s *PgStore) AppendTurns(ctx context.Context, agentID, threadKey, userID string, turns []Turn) (int64, []int64, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var count int
	var version int64

	err = tx.QueryRow(ctx,
		`INSERT INTO agent_thread (agent_id, thread_key, oidc_subject, last_activity_at)
		 VALUES ($1, $2, $3, now())
		 ON CONFLICT (agent_id, thread_key) DO UPDATE SET
		   oidc_subject = CASE WHEN agent_thread.oidc_subject = '' THEN EXCLUDED.oidc_subject ELSE agent_thread.oidc_subject END
		 RETURNING turn_count, version`,
		agentID, threadKey, userID,
	).Scan(&count, &version)
	if err != nil {
		return 0, nil, err
	}

	seqs := make([]int64, len(turns))

	for i, turn := range turns {
		seqs[i] = int64(count + i + 1)

		_, err = tx.Exec(ctx,
			// embedded_at is the terminal marker the sweep reads, so a turn that
			// arrives with a vector is stamped here — otherwise the sweep would
			// pick it up and embed over the one it was given.
			`INSERT INTO agent_turn (agent_id, thread_key, seq, role, content, tokens, attrs, embedding, embedded_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8::vector IS NULL THEN NULL ELSE now() END)`,
			agentID, threadKey, seqs[i], turn.Role, turn.Text, turn.Tokens,
			turn.Attrs, vectorLiteral(turn.Embedding))
		if err != nil {
			return 0, nil, err
		}
	}

	err = tx.QueryRow(ctx,
		`UPDATE agent_thread
		 SET turn_count = turn_count + $3, version = version + 1, last_activity_at = now()
		 WHERE agent_id = $1 AND thread_key = $2
		 RETURNING version`,
		agentID, threadKey, len(turns),
	).Scan(&version)
	if err != nil {
		return 0, nil, err
	}

	return version, seqs, tx.Commit(ctx)
}

// threadCursor pages by (last_activity_at, thread_key), which is the order the
// listing is in. An opaque string to the caller; a pair to us.
func threadCursor(t Thread) string {
	return t.LastActivityAt + "|" + t.ThreadKey
}

func splitThreadCursor(cursor string) (time.Time, string, bool) {
	at, key, found := strings.Cut(cursor, "|")
	if !found {
		return time.Time{}, "", false
	}

	parsed, err := time.Parse(time.RFC3339, at)
	if err != nil {
		return time.Time{}, "", false
	}

	return parsed, key, true
}

func (s *PgStore) ListThreads(ctx context.Context, agentID, userID, cursor string, limit int) ([]Thread, string, error) {
	if limit <= 0 {
		limit = defaultPage
	}

	after, afterKey, paged := splitThreadCursor(cursor)

	rows, err := s.pool.Query(ctx,
		`SELECT agent_id, thread_key, oidc_subject, title, version, turn_count, created_at, last_activity_at
		 FROM agent_thread
		 WHERE agent_id = $1
		   AND ($2 = '' OR oidc_subject = $2)
		   AND (NOT $3::bool OR (last_activity_at, thread_key) < ($4, $5))
		 ORDER BY last_activity_at DESC, thread_key DESC
		 LIMIT $6`,
		agentID, userID, paged, after, afterKey, limit+1)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	ret, err := scanThreads(rows)
	if err != nil {
		return nil, "", err
	}

	// One row past the page is how we know there is a next one without a
	// second count query.
	if len(ret) > limit {
		return ret[:limit], threadCursor(ret[limit-1]), nil
	}

	return ret, "", nil
}

func scanThreads(rows pgx.Rows) ([]Thread, error) {
	var ret []Thread

	for rows.Next() {
		var t Thread
		var created, active time.Time

		if err := rows.Scan(&t.AgentID, &t.ThreadKey, &t.UserID, &t.Title,
			&t.Version, &t.TurnCount, &created, &active); err != nil {
			return nil, err
		}

		t.CreatedAt = stamp(created)
		t.LastActivityAt = stamp(active)
		ret = append(ret, t)
	}

	return ret, rows.Err()
}

func (s *PgStore) ReadThread(ctx context.Context, agentID, threadKey, cursor string, limit int) (Thread, []Turn, string, error) {
	if limit <= 0 {
		limit = defaultPage
	}

	thread, err := s.readThreadRow(ctx, agentID, threadKey)
	if err != nil {
		return Thread{}, nil, "", err
	}

	after, _ := strconv.ParseInt(cursor, 10, 64)

	rows, err := s.pool.Query(ctx,
		`SELECT seq, role, content, tokens, attrs, created_at
		 FROM agent_turn
		 WHERE agent_id = $1 AND thread_key = $2 AND seq > $3
		 ORDER BY seq
		 LIMIT $4`,
		agentID, threadKey, after, limit+1)
	if err != nil {
		return Thread{}, nil, "", err
	}
	defer rows.Close()

	turns, err := scanTurns(rows)
	if err != nil {
		return Thread{}, nil, "", err
	}

	if len(turns) > limit {
		return thread, turns[:limit], strconv.FormatInt(turns[limit-1].Seq, 10), nil
	}

	return thread, turns, "", nil
}

func (s *PgStore) readThreadRow(ctx context.Context, agentID, threadKey string) (Thread, error) {
	var ret Thread
	var created, active time.Time

	err := s.pool.QueryRow(ctx,
		`SELECT agent_id, thread_key, oidc_subject, title, version, turn_count, created_at, last_activity_at
		 FROM agent_thread WHERE agent_id = $1 AND thread_key = $2`,
		agentID, threadKey,
	).Scan(&ret.AgentID, &ret.ThreadKey, &ret.UserID, &ret.Title,
		&ret.Version, &ret.TurnCount, &created, &active)

	if errors.Is(err, pgx.ErrNoRows) {
		return Thread{}, ErrMissing
	}

	ret.CreatedAt = stamp(created)
	ret.LastActivityAt = stamp(active)

	return ret, err
}

func scanTurns(rows pgx.Rows) ([]Turn, error) {
	var ret []Turn

	for rows.Next() {
		var t Turn
		var created time.Time

		if err := rows.Scan(&t.Seq, &t.Role, &t.Text, &t.Tokens, &t.Attrs, &created); err != nil {
			return nil, err
		}

		t.CreatedAt = stamp(created)
		ret = append(ret, t)
	}

	return ret, rows.Err()
}

// DeleteThread erases the conversation whole. The turns go with it through the
// foreign key, which is what makes erasure one statement that cannot half-fail.
func (s *PgStore) DeleteThread(ctx context.Context, agentID, threadKey string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM agent_thread WHERE agent_id = $1 AND thread_key = $2`, agentID, threadKey)
	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrMissing
	}

	return nil
}

func (s *PgStore) SetTitle(ctx context.Context, agentID, threadKey, userID, title string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO agent_thread (agent_id, thread_key, oidc_subject, title, last_activity_at)
		 VALUES ($1, $2, $3, $4, now())
		 ON CONFLICT (agent_id, thread_key) DO UPDATE SET
		   title = EXCLUDED.title,
		   oidc_subject = CASE WHEN agent_thread.oidc_subject = '' THEN EXCLUDED.oidc_subject ELSE agent_thread.oidc_subject END`,
		agentID, threadKey, userID, title)

	return err
}
