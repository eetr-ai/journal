package store

import "context"

// Pending is one row that has text but no vector yet. Kind says which table it
// came out of, because the two are addressed differently.
type Pending struct {
	Kind      string
	AgentID   string
	ThreadKey string
	Seq       int64
	UserID    string
	Name      string
	Text      string
}

// PendingVectors finds rows still waiting for an embedding, oldest first.
//
// Embedding is deliberately NOT on the write path: a provider that is slow costs
// a whole turn of a person's conversation if the append waits for it, and the
// record is worth more than the search index. So a row is written without a
// vector and picked up here — which also means a failed embedding is simply
// retried on the next pass rather than lost.
func (s *PgStore) PendingVectors(ctx context.Context, limit int) ([]Pending, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT 'turn', agent_id, thread_key, seq, '', '', content
		   FROM agent_turn
		  WHERE embedding IS NULL AND content <> ''
		  ORDER BY created_at
		  LIMIT $1`,
		limit)
	if err != nil {
		return nil, err
	}

	ret, err := scanPending(rows)
	rows.Close()

	if err != nil || len(ret) >= limit {
		return ret, err
	}

	rows, err = s.pool.Query(ctx,
		`SELECT 'user', agent_id, '', 0, oidc_subject, name, value
		   FROM agent_user_memory
		  WHERE embedding IS NULL AND value <> ''
		  ORDER BY updated_at
		  LIMIT $1`,
		limit-len(ret))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	memories, err := scanPending(rows)

	return append(ret, memories...), err
}

func scanPending(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
},
) ([]Pending, error) {
	var ret []Pending

	for rows.Next() {
		var p Pending

		if err := rows.Scan(&p.Kind, &p.AgentID, &p.ThreadKey, &p.Seq, &p.UserID, &p.Name, &p.Text); err != nil {
			return nil, err
		}

		ret = append(ret, p)
	}

	return ret, rows.Err()
}

// SetVector attaches an embedding to the row it came from. It never touches the
// text, so a row edited between the read and this write keeps whatever it says
// now — with a stale vector, which the next pass does not fix. That is
// acceptable here: neither a turn nor a memory is edited in place.
func (s *PgStore) SetVector(ctx context.Context, p Pending, vector []float32) error {
	if p.Kind == "user" {
		_, err := s.pool.Exec(ctx,
			`UPDATE agent_user_memory SET embedding = $4
			  WHERE agent_id = $1 AND oidc_subject = $2 AND name = $3`,
			p.AgentID, p.UserID, p.Name, vectorLiteral(vector))

		return err
	}

	_, err := s.pool.Exec(ctx,
		`UPDATE agent_turn SET embedding = $4
		  WHERE agent_id = $1 AND thread_key = $2 AND seq = $3`,
		p.AgentID, p.ThreadKey, p.Seq, vectorLiteral(vector))

	return err
}
