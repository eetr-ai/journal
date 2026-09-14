package store

import "context"

func (p *Private) ListMemories(ctx context.Context, agentID, userID string) ([]Memory, error) {
	ret, err := p.Store.ListMemories(ctx, agentID, userID)
	if err != nil {
		return nil, err
	}

	for i, memory := range ret {
		value, err := p.openText(memory.Value)
		if err != nil {
			return nil, err
		}

		ret[i].Value = value
	}

	return ret, nil
}

// PutMemory offers the fact's plaintext for embedding under the version the
// write landed at, so a fact rewritten a moment later does not get this one's
// vector.
func (p *Private) PutMemory(ctx context.Context, agentID, userID string, m Memory, expected int64) (int64, error) {
	plain := m.Value

	sealed, err := p.sealText(m.Value)
	if err != nil {
		return 0, err
	}

	m.Value = sealed

	version, err := p.Store.PutMemory(ctx, agentID, userID, m, expected)
	if err != nil {
		return 0, err
	}

	if plain != "" {
		p.vectors.Offer([]Pending{{
			Kind:    "user",
			AgentID: agentID,
			UserID:  userID,
			Name:    m.Name,
			Text:    plain,
			Version: version,
		}})
	}

	return version, nil
}

// Search opens what it found. A sealed row cannot be matched by the text
// fallback, so an unconfigured embedder means sealed memory does not answer
// searches at all — vectors are the only way in once the words are gone.
func (p *Private) Search(ctx context.Context, q Query) ([]Hit, error) {
	ret, err := p.Store.Search(ctx, q)
	if err != nil {
		return nil, err
	}

	for i, hit := range ret {
		text, err := p.openText(hit.Text)
		if err != nil {
			return nil, err
		}

		ret[i].Text = text
	}

	return ret, nil
}
