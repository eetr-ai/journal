// Package seal is AES-GCM, and nothing above it decides what a key means.
//
// Two callers with two different keys use it. One seals octo's own *_secrets
// namespaces under a key from our environment, where the guarantee is that a
// database dump is not a credential dump. The other seals a person's
// conversation under a key they forwarded with the run and we never keep.
// Keeping the distinction out of here is what lets the second exist at all.
package seal

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
)

// KeyBytes is AES-256. Generate one with `openssl rand -base64 32`.
const KeyBytes = 32

// ErrUnsealable is ciphertext that was sealed under another key, or altered
// since. There is no recovering from it and no point retrying.
var ErrUnsealable = errors.New("the value cannot be opened with this key")

// nonceLabel separates the key that picks a deterministic nonce from the key
// that encrypts under it, so one is never usable as the other.
const nonceLabel = "eetr-journal/seal/nonce/v1"

// Sealer is the one operation pair. Symmetric names for symmetric operations.
type Sealer struct {
	aead     cipher.AEAD
	nonceKey []byte
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

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(nonceLabel))

	return &Sealer{aead: aead, nonceKey: mac.Sum(nil)}, nil
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

// SealStably is Seal with the nonce derived from the value instead of drawn at
// random, so the same plaintext always produces the same ciphertext.
//
// It exists for a value that is also a lookup key: a name a row is addressed by
// cannot be sealed under a fresh nonce, because then no two writes of the same
// name would ever name the same row.
//
// The nonce-reuse failure AES-GCM is fragile about is a nonce repeated across
// DIFFERENT messages. Here the nonce is a function of the message, so a repeat
// means the message repeated too — which is the argument the SIV constructions
// are built on. Do not reach for this anywhere the equality of two values is
// worth hiding: identical plaintexts are visibly identical afterwards.
func (s *Sealer) SealStably(plain []byte) ([]byte, error) {
	mac := hmac.New(sha256.New, s.nonceKey)
	mac.Write(plain)

	nonce := mac.Sum(nil)[:s.aead.NonceSize()]

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
