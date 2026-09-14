package api_test

import (
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/eetr-ai/journal/platform/internal/api"
	"github.com/eetr-ai/journal/platform/internal/embed"
)

// The resource name is a query parameter precisely because it may contain
// slashes, which means `../` is a shape the contract invites. Everything here
// is about the line between a name and a path.
func withResources(t *testing.T) (http.Handler, string) {
	t.Helper()

	root := t.TempDir()

	if err := os.MkdirAll(filepath.Join(root, "skills"), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(root, "skills", "counselling.md"), []byte("# sitting with someone"), 0o600); err != nil {
		t.Fatal(err)
	}

	// A file one level up, which nothing served from here may reach.
	outside := filepath.Join(filepath.Dir(root), "secrets.env")
	if err := os.WriteFile(outside, []byte("OPENROUTER_API_KEY=real"), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { _ = os.Remove(outside) })

	return serverWithResources(&fakeStore{}, embed.NoopEmbedder{}, api.NewResources(root)), root
}

func TestAResourceIsServedByName(t *testing.T) {
	handler, _ := withResources(t)

	got := call(t, handler, http.MethodGet, "/v1/resources/content?kind=template&name=skills/counselling.md", "")

	if got.Code != http.StatusOK || got.Body.String() != "# sitting with someone" {
		t.Fatalf("got %d %q", got.Code, got.Body.String())
	}
}

func TestANameCannotClimbOutOfTheDirectory(t *testing.T) {
	handler, _ := withResources(t)

	for _, name := range []string{
		"../secrets.env",
		"skills/../../secrets.env",
		"skills/../../../../../../etc/passwd",
		"/etc/passwd",
	} {
		got := call(t, handler, http.MethodGet, "/v1/resources/content?kind=template&name="+name, "")

		if got.Code != http.StatusNotFound {
			t.Fatalf("%q answered %d and returned %q", name, got.Code, got.Body.String())
		}
	}
}

func TestAMissingResourceIsAMiss(t *testing.T) {
	handler, _ := withResources(t)

	if got := call(t, handler, http.MethodGet, "/v1/resources/content?kind=template&name=skills/nothing.md", ""); got.Code != http.StatusNotFound {
		t.Fatalf("got %d", got.Code)
	}
}

// With no directory configured the capability is off, and the runtime has to be
// told that rather than shown an empty answer it would read as "missing".
func TestWithoutADirectoryResourcesAreNotImplemented(t *testing.T) {
	handler := serverWith(&fakeStore{}, embed.NoopEmbedder{})

	if got := call(t, handler, http.MethodGet, "/v1/resources/content?kind=template&name=x", ""); got.Code != http.StatusNotImplemented {
		t.Fatalf("got %d", got.Code)
	}
}
