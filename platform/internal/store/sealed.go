package store

import (
	"context"
	"strings"

	"github.com/eetr-ai/journal/platform/internal/seal"
)

// secretsSuffix is how a namespace says its values are credentials. Routing on
// the name rather than on a closed list is the same rule the contract states
// for namespaces generally: a platform that gains a tier must not need this
// file to change.
const secretsSuffix = "_secrets"

// Sealed wraps a Store and encrypts what goes into the secrets namespaces.
// A decorator rather than a branch inside PgStore, so the SQL stays about SQL
// and a deployment with no key configured simply does not build one of these.
type Sealed struct {
	Store
	sealer *seal.Sealer
}

func NewSealed(inner Store, sealer *seal.Sealer) *Sealed {
	return &Sealed{Store: inner, sealer: sealer}
}

func sealable(namespace string) bool {
	return strings.HasSuffix(namespace, secretsSuffix)
}

func (s *Sealed) GetEntry(ctx context.Context, namespace, key string) (Entry, error) {
	ret, err := s.Store.GetEntry(ctx, namespace, key)
	if err != nil || !sealable(namespace) {
		return ret, err
	}

	opened, err := s.sealer.Open(ret.Value)
	if err != nil {
		return Entry{}, err
	}

	ret.Value = opened

	return ret, nil
}

func (s *Sealed) PutEntry(ctx context.Context, namespace, key string, value []byte, expected int64) (int64, error) {
	if !sealable(namespace) {
		return s.Store.PutEntry(ctx, namespace, key, value, expected)
	}

	sealedValue, err := s.sealer.Seal(value)
	if err != nil {
		return 0, err
	}

	return s.Store.PutEntry(ctx, namespace, key, sealedValue, expected)
}
