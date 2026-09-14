package api_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/eetr-ai/journal/platform/internal/api"
	"github.com/eetr-ai/journal/platform/internal/bus"
	"github.com/eetr-ai/journal/platform/internal/embed"
	"github.com/eetr-ai/journal/platform/internal/locks"
	"github.com/eetr-ai/journal/platform/internal/store"
)

// The HTTP layer is tested against fakes on purpose: what is worth proving here
// is the contract's status codes, and a real database would only make that
// slower without making it truer.

type fakeStore struct {
	store.Store
	entry   store.Entry
	entryOK bool
	err     error
}

func (f *fakeStore) GetEntry(context.Context, string, string) (store.Entry, error) {
	if !f.entryOK {
		return store.Entry{}, store.ErrMissing
	}

	return f.entry, nil
}

func (f *fakeStore) PutEntry(context.Context, string, string, []byte, int64) (int64, error) {
	if f.err != nil {
		return 0, f.err
	}

	return 7, nil
}

func serverWith(s store.Store, e embed.Embedder) http.Handler {
	return serverWithResources(s, e, api.Resources{})
}

func serverWithResources(s store.Store, e embed.Embedder, resources api.Resources) http.Handler {
	return api.NewServer(api.Config{
		Resources: resources,
		Store:     s,
		Locks:     (locks.Locks)(nil),
		Bus:       (bus.Bus)(nil),
		Embedder:  e,
		Name:      "journal-platform",
		Version:   "test",
		Log:       slog.New(slog.NewTextHandler(io.Discard, nil)),
	}).Handler()
}

func call(t *testing.T, handler http.Handler, method, target, body string) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(method, target, strings.NewReader(body))
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	return recorder
}

// This is the one the whole router hangs on. The runtime turns a capability off
// for the life of the process when it sees 501, and reads 404 as "nothing
// stored" — so a route we have not written must never fall through to Go's
// default 404.
func TestAnUnwrittenRouteIs501(t *testing.T) {
	handler := serverWith(&fakeStore{}, embed.NoopEmbedder{})

	got := call(t, handler, http.MethodGet, "/v1/resources/content?kind=env&name=x", "")

	if got.Code != http.StatusNotImplemented {
		t.Fatalf("an unimplemented route answered %d, and 404 would make the runtime keep asking forever", got.Code)
	}
}

func TestAMissingEntryIs404(t *testing.T) {
	handler := serverWith(&fakeStore{}, embed.NoopEmbedder{})

	if got := call(t, handler, http.MethodGet, "/v1/kv/user/entry?key=nothing", ""); got.Code != http.StatusNotFound {
		t.Fatalf("a miss answered %d", got.Code)
	}
}

func TestAVersionConflictIs409(t *testing.T) {
	handler := serverWith(&fakeStore{err: store.ErrConflict}, embed.NoopEmbedder{})

	got := call(t, handler, http.MethodPut, "/v1/kv/user/entry?key=taken", "value")

	if got.Code != http.StatusConflict {
		t.Fatalf("a losing write answered %d rather than 409, so a concurrent update is being lost silently", got.Code)
	}
}

// The version travels in a header both ways, and a caller that cannot read the
// new one has no way to make its next write.
func TestAWriteAnswersWithTheNewVersion(t *testing.T) {
	handler := serverWith(&fakeStore{}, embed.NoopEmbedder{})

	got := call(t, handler, http.MethodPut, "/v1/kv/user/entry?key=fresh", "value")

	if got.Code != http.StatusOK || got.Header().Get("X-Object-Version") != "7" {
		t.Fatalf("got %d with version %q", got.Code, got.Header().Get("X-Object-Version"))
	}
}

func TestAReadCarriesTheStoredValueAndVersion(t *testing.T) {
	handler := serverWith(&fakeStore{entryOK: true, entry: store.Entry{Value: []byte("stored"), Version: 3}}, embed.NoopEmbedder{})

	got := call(t, handler, http.MethodGet, "/v1/kv/user/entry?key=here", "")

	if got.Body.String() != "stored" || got.Header().Get("X-Object-Version") != "3" {
		t.Fatalf("got %q at version %q", got.Body.String(), got.Header().Get("X-Object-Version"))
	}
}

// Discovery is called once and everything else is conditional on it, so what it
// claims has to match what is actually wired up. `semantic` in particular is
// read by a UI to tell a person what kind of search they got.
func TestDiscoverySaysWhatSearchActuallyIs(t *testing.T) {
	for _, probe := range []struct {
		name     string
		embedder embed.Embedder
		semantic bool
	}{
		{"without an embedder", embed.NoopEmbedder{}, false},
		{"with one", embed.NewOpenRouter("key", "model", 1024), true},
	} {
		t.Run(probe.name, func(t *testing.T) {
			got := call(t, serverWith(&fakeStore{}, probe.embedder), http.MethodGet, "/v1/discovery", "")

			var decoded struct {
				SpecVersion string `json:"specVersion"`
				Features    struct {
					AgentMemory struct {
						Supported bool `json:"supported"`
						Semantic  bool `json:"semantic"`
					} `json:"agentMemory"`
					Queues struct {
						Supported    bool `json:"supported"`
						RequestReply bool `json:"requestReply"`
					} `json:"queues"`
				} `json:"features"`
			}

			if err := json.NewDecoder(got.Body).Decode(&decoded); err != nil {
				t.Fatal(err)
			}

			if decoded.SpecVersion != "1.0" {
				t.Fatalf("spec version %q", decoded.SpecVersion)
			}

			if !decoded.Features.AgentMemory.Supported {
				t.Fatal("agent memory is wired up but not declared")
			}

			if decoded.Features.AgentMemory.Semantic != probe.semantic {
				t.Fatalf("declared semantic=%v %s", decoded.Features.AgentMemory.Semantic, probe.name)
			}

			// Declared off so the runtime refuses the call up front naming the
			// flag, rather than a caller waiting out a timeout for a reply
			// nothing will ever send.
			if decoded.Features.Queues.RequestReply {
				t.Fatal("request/reply is declared but not implemented")
			}
		})
	}
}

// More turns than discovery promised has to be refused rather than half-stored:
// the runtime chunks a longer run, and silently dropping the tail would lose a
// person's transcript.
func TestAnOversizedAppendIsRefused(t *testing.T) {
	handler := serverWith(&fakeStore{}, embed.NoopEmbedder{})

	var turns []string
	for range 101 {
		turns = append(turns, `{"role":"user","text":"x"}`)
	}

	body := `{"turns":[` + strings.Join(turns, ",") + `]}`
	got := call(t, handler, http.MethodPost, "/v1/agent-memory/journal/threads/t/turns", body)

	if got.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("an oversized append answered %d", got.Code)
	}
}
