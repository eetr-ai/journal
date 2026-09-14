package api

import (
	"encoding/base64"
	"net/http"
	"strings"
	"testing"
)

// The header is how a key reaches this process, so the interesting cases are
// all the ways a caller can mean to forward one and fail. Reading any of them
// as "nothing was forwarded" would seal nothing and say nothing.
func request(value string) *http.Request {
	ret, _ := http.NewRequest(http.MethodGet, "/", nil)

	if value != "" {
		ret.Header.Set(contextHeader, value)
	}

	return ret
}

func encoded(json string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(json))
}

func TestForwardedContextAbsent(t *testing.T) {
	ret, err := forwardedContext(request(""))
	if err != nil {
		t.Fatalf("no header should not be an error: %v", err)
	}

	if ret == nil || len(ret) != 0 {
		t.Fatalf("no header should read as an empty map, got %v", ret)
	}
}

func TestForwardedContextReadsTheKey(t *testing.T) {
	ret, err := forwardedContext(request(encoded(`{"key":"s3cret","tenant":"a"}`)))
	if err != nil {
		t.Fatal(err)
	}

	if ret[contextKeyName] != "s3cret" || ret["tenant"] != "a" {
		t.Fatalf("decoded %v", ret)
	}
}

func TestForwardedContextRefusals(t *testing.T) {
	cases := map[string]string{
		"not base64url":         "!!!!",
		"padded base64":         base64.StdEncoding.EncodeToString([]byte(`{"key":"a"}`)),
		"a JSON null":           encoded(`null`),
		"an entry that is null": encoded(`{"key":null}`),
		"not an object":         encoded(`["key"]`),
		"over the limit":        strings.Repeat("A", contextLimit+1),
	}

	for name, value := range cases {
		if _, err := forwardedContext(request(value)); err == nil {
			t.Errorf("%s should be refused", name)
		}
	}
}
