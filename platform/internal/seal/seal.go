// Package seal is AES-GCM over the values octo writes to its *_secrets
// namespaces.
//
// This is our own infrastructure secret — a connector credential a flow parked
// — and not a person's writing, which is protected somewhere else entirely and
// under a key we never see. The key here is ours, read from the environment,
// and the guarantee is only that a database dump is not a credential dump.
package seal

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
)

// KeyBytes is AES-256. Generate one with `openssl rand -base64 32`.
const KeyBytes = 32

// ErrUnsealable is ciphertext that was sealed under another key, or altered
// since. There is no recovering from it and no point retrying.
var ErrUnsealable = errors.New("the value cannot be opened with this key")

// Sealer is the one operation pair. Symmetric names for symmetric operations.
type Sealer struct {
	aead cipher.AEAD
}

// New takes the key as base64, which is the form `openssl rand -base64 32`
// produces and the form a Kubernetes Secret carries it in.
func New(encodedKey string) (*Sealer, error) {
	key, err := base64.StdEncoding.DecodeString(encodedKey)
	if err != nil {
		return nil, fmt.Errorf("secrets key is not base64: %w", err)
	}

	if len(key) != KeyBytes {
		return nil, fmt.Errorf("secrets key is %d bytes, want %d", len(key), KeyBytes)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	return &Sealer{aead: aead}, nil
}

// Seal returns nonce ‖ ciphertext. The nonce travels with the value because
// there is nowhere else to put it and nothing about it is secret.
func (s *Sealer) Seal(plain []byte) ([]byte, error) {
	nonce := make([]byte, s.aead.NonceSize())

	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}

	return s.aead.Seal(nonce, nonce, plain, nil), nil
}

func (s *Sealer) Open(sealed []byte) ([]byte, error) {
	size := s.aead.NonceSize()

	if len(sealed) < size {
		return nil, ErrUnsealable
	}

	ret, err := s.aead.Open(nil, sealed[:size], sealed[size:], nil)
	if err != nil {
		return nil, ErrUnsealable
	}

	return ret, nil
}
