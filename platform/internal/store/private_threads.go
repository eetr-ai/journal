package store

import "context"

func (p *Private) LoadWorking(ctx context.Context, agentID, threadKey string) (Working, error) {
	ret, err := p.Store.LoadWorking(ctx, agentID, threadKey)
	if err != nil {
		return ret, err
	}

	opened, err := p.openBytes(ret.Value)
	if err != nil {
		return Working{}, err
	}

	ret.Value = opened

	return ret, nil
}

func (p *Private) SaveWorking(ctx context.Context, agentID, threadKey, userID string, w Working, expected int64) (int64, error) {
	sealed, err := p.sealBytes(w.Value)
	if err != nil {
		return 0, err
	}

	w.Value = sealed

	return p.Store.SaveWorking(ctx, agentID, threadKey, userID, w, expected)
}

// AppendTurns seals each turn and offers its plaintext for embedding in the
// same breath. This is the only moment the two exist together: once the row is
// written, nothing in this process can read it back to embed it.
func (p *Private) AppendTurns(ctx context.Context, agentID, threadKey, userID string, turns []Turn) (int64, []int64, error) {
	plain := make([]string, len(turns))
	sealed := make([]Turn, len(turns))

	for i, turn := range turns {
		plain[i] = turn.Text

		text, err := p.sealText(turn.Text)
		if err != nil {
			return 0, nil, err
		}

		sealed[i] = turn
		sealed[i].Text = text
	}

	version, seqs, err := p.Store.AppendTurns(ctx, agentID, threadKey, userID, sealed)
	if err != nil {
		return 0, nil, err
	}

	p.offerTurns(agentID, threadKey, seqs, plain)

	return version, seqs, nil
}

func (p *Private) offerTurns(agentID, threadKey string, seqs []int64, plain []string) {
	var rows []Pending

	for i, seq := range seqs {
		if i >= len(plain) || plain[i] == "" {
			continue
		}

		rows = append(rows, Pending{
			Kind:      "turn",
			AgentID:   agentID,
			ThreadKey: threadKey,
			Seq:       seq,
			Text:      plain[i],
		})
	}

	if len(rows) > 0 {
		p.vectors.Offer(rows)
	}
}

func (p *Private) ListThreads(ctx context.Context, agentID, userID, cursor string, limit int) ([]Thread, string, error) {
	threads, next, err := p.Store.ListThreads(ctx, agentID, userID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	for i, thread := range threads {
		title, err := p.openText(thread.Title)
		if err != nil {
			return nil, "", err
		}

		threads[i].Title = title
	}

	return threads, next, nil
}

func (p *Private) ReadThread(ctx context.Context, agentID, threadKey, cursor string, limit int) (Thread, []Turn, string, error) {
	thread, turns, next, err := p.Store.ReadThread(ctx, agentID, threadKey, cursor, limit)
	if err != nil {
		return thread, nil, "", err
	}

	if thread.Title, err = p.openText(thread.Title); err != nil {
		return Thread{}, nil, "", err
	}

	for i, turn := range turns {
		text, err := p.openText(turn.Text)
		if err != nil {
			return Thread{}, nil, "", err
		}

		turns[i].Text = text
	}

	return thread, turns, next, nil
}

func (p *Private) SetTitle(ctx context.Context, agentID, threadKey, userID, title string) error {
	sealed, err := p.sealText(title)
	if err != nil {
		return err
	}

	return p.Store.SetTitle(ctx, agentID, threadKey, userID, sealed)
}
