package store

import "context"

func (p *Private) ListMemories(ctx context.Context, agentID, userID string) ([]Memory, error) {
	ret, err := p.Store.ListMemories(ctx, agentID, userID)
	if err != nil {
		return nil, err
	}

	for i, memory := range ret {
		name, err := p.openText(memory.Name)
		if err != nil {
			return nil, err
		}

		value, err := p.openText(memory.Value)
		if err != nil {
			return nil, err
		}

		ret[i].Name = name
		ret[i].Value = value
	}

	return ret, nil
}

// PutMemory offers the fact's plaintext for embedding under the version the
// write landed at, so a fact rewritten a moment later does not get this one's
// vector.
//
// The offer names the row by its SEALED name, because that is what the column
// holds and what the write-back has to match.
func (p *Private) PutMemory(ctx context.Context, agentID, userID string, m Memory, expected int64) (int64, error) {
	plain := m.Value

	name, err := p.sealName(m.Name)
	if err != nil {
		return 0, err
	}

	value, err := p.sealText(m.Value)
	if err != nil {
		return 0, err
	}

	m.Name = name
	m.Value = value

	version, err := p.Store.PutMemory(ctx, agentID, userID, m, expected)
	if err != nil {
		return 0, err
	}

	if plain != "" {
		p.vectors.Offer([]Pending{{
			Kind:    "user",
			AgentID: agentID,
			UserID:  userID,
			Name:    name,
			Text:    plain,
			Version: version,
		}})
	}

	return version, nil
}

// DeleteMemory addresses the same row the write did, so it seals the name the
// same way. Nothing else about a delete needs a key.
func (p *Private) DeleteMemory(ctx context.Context, agentID, userID, name string) error {
	sealed, err := p.sealName(name)
	if err != nil {
		return err
	}

	return p.Store.DeleteMemory(ctx, agentID, userID, sealed)
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
		name, err := p.openText(hit.Name)
		if err != nil {
			return nil, err
		}

		text, err := p.openText(hit.Text)
		if err != nil {
			return nil, err
		}

		ret[i].Name = name
		ret[i].Text = text
	}

	return ret, nil
}
