package store

import "context"

// Pending is one row that has text and has not been embedded yet. Kind says
// which table it came out of, because the two are addressed differently.
type Pending struct {
	Kind      string
	AgentID   string
	ThreadKey string
	Seq       int64
	UserID    string
	Name      string
	Text      string
	// Version guards the write back. A memory can be rewritten between the read
	// and the update, and attaching the old value's vector to the new value
	// would make search quietly wrong.
	Version int64
}

// PendingVectors finds rows still waiting to be embedded, oldest first across
// both stores.
//
// Embedding is deliberately NOT on the write path: a provider that is slow costs
// a whole turn of a person's conversation if the append waits for it, and the
// record is worth more than the search index. So a row is written without a
// vector and picked up here — which also means a failed embedding is simply
// retried on the next pass rather than lost.
//
// One UNION rather than one query per table: taking turns first would mean a
// busy conversation starves user memories of embeddings indefinitely.
func (s *PgStore) PendingVectors(ctx context.Context, limit int) ([]Pending, error) {
	rows, err := s.pool.Query(ctx,
		`(SELECT 'turn' AS kind, agent_id, thread_key, seq, '' AS oidc_subject, '' AS name,
		         content AS text, 0::bigint AS version, created_at AS at
		    FROM agent_turn
		   WHERE embedded_at IS NULL AND content <> ''
		   ORDER BY created_at
		   LIMIT $1)
		 UNION ALL
		 (SELECT 'user', agent_id, '', 0, oidc_subject, name,
		         value, version, updated_at
		    FROM agent_user_memory
		   WHERE embedded_at IS NULL AND value <> ''
		   ORDER BY updated_at
		   LIMIT $1)
		 ORDER BY at
		 LIMIT $1`,
		limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ret []Pending

	for rows.Next() {
		var p Pending
		var at any

		if err := rows.Scan(&p.Kind, &p.AgentID, &p.ThreadKey, &p.Seq,
			&p.UserID, &p.Name, &p.Text, &p.Version, &at); err != nil {
			return nil, err
		}

		ret = append(ret, p)
	}

	return ret, rows.Err()
}

// SetVector attaches an embedding to the row it came from, and marks the row as
// considered either way.
//
// A nil vector is a legitimate answer — the provider declined this one — and
// marking it still terminates it, so it does not hold the front of the queue
// against everything behind it.
//
// A memory rewritten since the read fails the version predicate and matches no
// row, which leaves it pending: the next pass embeds what it says now.
func (s *PgStore) SetVector(ctx context.Context, p Pending, vector []float32) error {
	if p.Kind == "user" {
		_, err := s.pool.Exec(ctx,
			`UPDATE agent_user_memory SET embedding = $4, embedded_at = now()
			  WHERE agent_id = $1 AND oidc_subject = $2 AND name = $3 AND version = $5`,
			p.AgentID, p.UserID, p.Name, vectorLiteral(vector), p.Version)

		return err
	}

	_, err := s.pool.Exec(ctx,
		`UPDATE agent_turn SET embedding = $4, embedded_at = now()
		  WHERE agent_id = $1 AND thread_key = $2 AND seq = $3`,
		p.AgentID, p.ThreadKey, p.Seq, vectorLiteral(vector))

	return err
}
