package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PgStore) ListMemories(ctx context.Context, agentID, userID string) ([]Memory, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT name, value, version, created_at, updated_at
		 FROM agent_user_memory
		 WHERE agent_id = $1 AND oidc_subject = $2
		 ORDER BY updated_at DESC`,
		agentID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ret []Memory

	for rows.Next() {
		var m Memory
		var created, updated time.Time

		if err := rows.Scan(&m.Name, &m.Value, &m.Version, &created, &updated); err != nil {
			return nil, err
		}

		m.CreatedAt = stamp(created)
		m.UpdatedAt = stamp(updated)
		ret = append(ret, m)
	}

	return ret, rows.Err()
}

// PutMemory creates or replaces one fact under the same version rules as a kv
// entry: 0 creates and must lose against an existing name.
func (s *PgStore) PutMemory(ctx context.Context, agentID, userID string, m Memory, expected int64) (int64, error) {
	var ret int64

	if expected == 0 {
		err := s.pool.QueryRow(ctx,
			`INSERT INTO agent_user_memory (agent_id, oidc_subject, name, value, embedding, version)
			 VALUES ($1, $2, $3, $4, $5, 1)
			 ON CONFLICT DO NOTHING
			 RETURNING version`,
			agentID, userID, m.Name, m.Value, vectorLiteral(m.Embedding),
		).Scan(&ret)

		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrConflict
		}

		return ret, err
	}

	err := s.pool.QueryRow(ctx,
		`UPDATE agent_user_memory
		 SET value = $4, embedding = $5, version = version + 1, updated_at = now()
		 WHERE agent_id = $1 AND oidc_subject = $2 AND name = $3 AND version = $6
		 RETURNING version`,
		agentID, userID, m.Name, m.Value, vectorLiteral(m.Embedding), expected,
	).Scan(&ret)

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrConflict
	}

	return ret, err
}

func (s *PgStore) DeleteMemory(ctx context.Context, agentID, userID, name string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM agent_user_memory WHERE agent_id = $1 AND oidc_subject = $2 AND name = $3`,
		agentID, userID, name)
	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrMissing
	}

	return nil
}
