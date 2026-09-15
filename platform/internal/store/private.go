package store

import (
	"encoding/base64"
	"strings"

	"github.com/eetr-ai/journal/platform/internal/seal"
)

// Private is agent memory sealed under a key this process never keeps.
//
// It is built per request from the key the flow forwarded, which is what
// separates it from Sealed: that one protects our own credentials under our own
// key, this one protects a person's conversation under theirs. Nothing here
// outlives the call that made it.
//
// What is sealed: the recorded turns, the engine's working context, the
// conversation's title, and both halves of every remembered fact.
//
// A fact's name is the primary key its row is addressed by, so it is sealed
// stably — the same name has to keep naming the same row. Nothing is given up
// by that here: the key is unique per person and name, so no two rows can share
// a name for their sameness to show, and two people's keys differ. Search never
// reads a name; it ranks on the vector taken from the value.

// sealedPrefix makes a stored value say what it is, so a row written before
// there was a key — or by a run that forwarded none — still reads back.
const sealedPrefix = "enc1:"

// Vectors is where the plaintext of a sealed row goes to be embedded. A sealed
// row cannot be read back for it, so the writer hands it over as it writes,
// being the only party that holds it.
type Vectors interface {
	Offer(rows []Pending)
}

// NoVectors is the null object: a deployment with no embedder configured.
type NoVectors struct{}

func (NoVectors) Offer([]Pending) {}

type Private struct {
	Store
	sealer  *seal.Sealer
	vectors Vectors
}

func NewPrivate(inner Store, sealer *seal.Sealer, vectors Vectors) *Private {
	return &Private{Store: inner, sealer: sealer, vectors: vectors}
}

// IsSealed says whether a stored value needs a key to read. Exported because
// the pending-vector sweep has to skip what it cannot read.
func IsSealed(value string) bool {
	return strings.HasPrefix(value, sealedPrefix)
}

func (p *Private) sealText(plain string) (string, error) {
	return p.sealWith(p.sealer.Seal, plain)
}

// sealName is stable, because a name is how its row is found again. The layout
// is the same as any other sealed value, so opening one needs no special case.
func (p *Private) sealName(plain string) (string, error) {
	return p.sealWith(p.sealer.SealStably, plain)
}

func (p *Private) sealWith(how func([]byte) ([]byte, error), plain string) (string, error) {
	if plain == "" {
		return "", nil
	}

	sealed, err := how([]byte(plain))
	if err != nil {
		return "", err
	}

	return sealedPrefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// openText returns a value that was never sealed unchanged. A value that was
// sealed and will not open is an error and stays one: answering with nothing
// would let a conversation resume from a blank history it would then overwrite.
func (p *Private) openText(stored string) (string, error) {
	if !IsSealed(stored) {
		return stored, nil
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, sealedPrefix))
	if err != nil {
		return "", seal.ErrUnsealable
	}

	opened, err := p.sealer.Open(raw)
	if err != nil {
		return "", err
	}

	return string(opened), nil
}

func (p *Private) sealBytes(plain []byte) ([]byte, error) {
	if len(plain) == 0 {
		return plain, nil
	}

	sealed, err := p.sealer.Seal(plain)
	if err != nil {
		return nil, err
	}

	return append([]byte(sealedPrefix), sealed...), nil
}

func (p *Private) openBytes(stored []byte) ([]byte, error) {
	if !IsSealed(string(stored)) {
		return stored, nil
	}

	return p.sealer.Open(stored[len(sealedPrefix):])
}
