package store

import (
	"context"
	"sort"
)

// defaultHits is the answer size when the caller names no limit.
const defaultHits = 10

// textScore is what a text match is worth. A constant, because ILIKE ranks
// nothing — it only says "this contains that", and pretending otherwise would
// put a meaningless number in front of a person.
const textScore = 0.5

// Search ranks by embedding similarity when the caller supplied a vector, and
// by text matching when it did not. Both are valid answers; discovery says which
// we did, so a UI can tell a person what kind of search they got.
//
// The text fallback cannot reach a sealed row: there are no words in it to
// match. For a deployment that seals, vectors are not an improvement on text
// search, they are the only search there is.
func (s *PgStore) Search(ctx context.Context, q Query) ([]Hit, error) {
	if q.Limit <= 0 {
		q.Limit = defaultHits
	}

	var ret []Hit

	if q.Scope != "user" {
		hits, err := s.searchTurns(ctx, q)
		if err != nil {
			return nil, err
		}
		ret = append(ret, hits...)
	}

	if q.Scope != "turns" {
		hits, err := s.searchMemories(ctx, q)
		if err != nil {
			return nil, err
		}
		ret = append(ret, hits...)
	}

	sort.SliceStable(ret, func(i, j int) bool { return ret[i].Score > ret[j].Score })

	if len(ret) > q.Limit {
		return ret[:q.Limit], nil
	}

	return ret, nil
}

// searchTurns looks through the durable conversation record. The join onto the
// thread is what scopes a search to one person: a turn does not know whose it is.
func (s *PgStore) searchTurns(ctx context.Context, q Query) ([]Hit, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT t.thread_key, t.seq, t.content,
		        CASE WHEN $6::vector IS NULL THEN $7::float8
		             ELSE 1 - (t.embedding <=> $6::vector) END AS score
		 FROM agent_turn t
		 JOIN agent_thread h ON h.agent_id = t.agent_id AND h.thread_key = t.thread_key
		 WHERE t.agent_id = $1
		   AND ($2 = '' OR h.oidc_subject = $2)
		   AND ($3 = '' OR t.thread_key = $3)
		   AND ($6::vector IS NOT NULL AND t.embedding IS NOT NULL
		        OR $6::vector IS NULL AND t.content ILIKE '%' || $4 || '%')
		 ORDER BY score DESC
		 LIMIT $5`,
		q.AgentID, q.UserID, q.ThreadKey, q.Text, q.Limit, vectorLiteral(q.Vector), textScore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ret []Hit

	for rows.Next() {
		hit := Hit{Kind: "turn"}

		if err := rows.Scan(&hit.ThreadKey, &hit.Seq, &hit.Text, &hit.Score); err != nil {
			return nil, err
		}

		ret = append(ret, hit)
	}

	return ret, rows.Err()
}

func (s *PgStore) searchMemories(ctx context.Context, q Query) ([]Hit, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT name, value,
		        CASE WHEN $5::vector IS NULL THEN $6::float8
		             ELSE 1 - (embedding <=> $5::vector) END AS score
		 FROM agent_user_memory
		 WHERE agent_id = $1
		   AND ($2 = '' OR oidc_subject = $2)
		   AND ($5::vector IS NOT NULL AND embedding IS NOT NULL
		        OR $5::vector IS NULL AND value ILIKE '%' || $3 || '%')
		 ORDER BY score DESC
		 LIMIT $4`,
		q.AgentID, q.UserID, q.Text, q.Limit, vectorLiteral(q.Vector), textScore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ret []Hit

	for rows.Next() {
		hit := Hit{Kind: "user"}

		if err := rows.Scan(&hit.Name, &hit.Text, &hit.Score); err != nil {
			return nil, err
		}

		ret = append(ret, hit)
	}

	return ret, rows.Err()
}
