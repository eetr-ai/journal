package seal_test

import (
	"encoding/base64"
	"errors"
	"testing"

	"github.com/eetr-ai/journal/platform/internal/seal"
)

func testKey(t *testing.T, fill byte) string {
	t.Helper()

	key := make([]byte, seal.KeyBytes)
	for i := range key {
		key[i] = fill
	}

	return base64.StdEncoding.EncodeToString(key)
}

func TestAValueSurvivesTheRoundTrip(t *testing.T) {
	sealer, err := seal.New(testKey(t, 1))
	if err != nil {
		t.Fatal(err)
	}

	sealed, err := sealer.Seal([]byte("a connector credential"))
	if err != nil {
		t.Fatal(err)
	}

	if string(sealed) == "a connector credential" {
		t.Fatal("the value was not sealed at all")
	}

	opened, err := sealer.Open(sealed)
	if err != nil || string(opened) != "a connector credential" {
		t.Fatalf("got %q (%v)", opened, err)
	}
}

// A fresh nonce per seal is what stops two identical values from looking
// identical in the database.
func TestTheSameValueSealsDifferentlyEachTime(t *testing.T) {
	sealer, _ := seal.New(testKey(t, 2))

	first, _ := sealer.Seal([]byte("same"))
	second, _ := sealer.Seal([]byte("same"))

	if string(first) == string(second) {
		t.Fatal("the nonce is being reused, so equal values are visibly equal")
	}
}

// A value sealed under a different key, or altered since, must fail rather than
// come back as plausible nonsense — which is what the AEAD tag is for.
func TestAnotherKeyCannotOpenIt(t *testing.T) {
	mine, _ := seal.New(testKey(t, 3))
	theirs, _ := seal.New(testKey(t, 4))

	sealed, _ := mine.Seal([]byte("secret"))

	if _, err := theirs.Open(sealed); !errors.Is(err, seal.ErrUnsealable) {
		t.Fatalf("another key opened it: %v", err)
	}

	sealed[len(sealed)-1] ^= 0xff

	if _, err := mine.Open(sealed); !errors.Is(err, seal.ErrUnsealable) {
		t.Fatalf("an altered value opened: %v", err)
	}
}

func TestAKeyOfTheWrongSizeIsRefusedAtStartup(t *testing.T) {
	if _, err := seal.New(base64.StdEncoding.EncodeToString([]byte("too short"))); err == nil {
		t.Fatal("a short key was accepted, so AES-256 was quietly not what we got")
	}

	if _, err := seal.New("not base64 at all!!"); err == nil {
		t.Fatal("a malformed key was accepted")
	}
}
