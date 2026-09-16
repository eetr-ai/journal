package seal_test

import (
	"bytes"
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

func sealerFor(t *testing.T, fill byte) *seal.Sealer {
	t.Helper()

	ret, err := seal.New(testKey(t, fill))
	if err != nil {
		t.Fatal(err)
	}

	return ret
}

func stably(t *testing.T, sealer *seal.Sealer, plain string) []byte {
	t.Helper()

	ret, err := sealer.SealStably([]byte(plain))
	if err != nil {
		t.Fatal(err)
	}

	return ret
}

// A stable seal is what lets a sealed value go on being a lookup key. The two
// properties that matter pull against each other, so both are asserted: the
// same name must land on the same bytes, and a different name must not.
func TestSealStablyRepeats(t *testing.T) {
	sealer := sealerFor(t, 1)

	if !bytes.Equal(stably(t, sealer, "toca-el-bajo"), stably(t, sealer, "toca-el-bajo")) {
		t.Fatal("the same name sealed twice must land on the same row")
	}

	if bytes.Equal(stably(t, sealer, "toca-el-bajo"), stably(t, sealer, "toca-la-guitarra")) {
		t.Fatal("two names must not collide onto one row")
	}
}

func TestSealStablyOpens(t *testing.T) {
	sealer := sealerFor(t, 2)

	opened, err := sealer.Open(stably(t, sealer, "formacion-rock-argentino"))
	if err != nil {
		t.Fatal(err)
	}

	if string(opened) != "formacion-rock-argentino" {
		t.Fatalf("opened %q", opened)
	}
}

// Two people's facts are sealed under two keys, so one name must not look the
// same in both rows. This is the boundary a deterministic nonce could have cost
// us, and the one that actually matters.
func TestStableSealsDifferBetweenKeys(t *testing.T) {
	if bytes.Equal(stably(t, sealerFor(t, 3), "religion"), stably(t, sealerFor(t, 4), "religion")) {
		t.Fatal("the same name under two keys must not look the same")
	}
}

// A stable nonce must not weaken the seal: another key still cannot open it.
func TestStableSealsStillNeedTheirKey(t *testing.T) {
	if _, err := sealerFor(t, 6).Open(stably(t, sealerFor(t, 5), "religion")); err == nil {
		t.Fatal("another key opened a stably sealed value")
	}
}
