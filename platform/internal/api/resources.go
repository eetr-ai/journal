package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

/*
 * The files an integration loads by name: skill bodies, templates, .env files.
 *
 * Under the platform-API provider the runtime asks for these rather than
 * reading them off its own disk, which is what lets a platform hold the bundle
 * — and here the bundle is a directory baked into this image beside the flows
 * that reference it.
 */

// Resources serves a directory, or nothing when none is configured.
type Resources struct {
	root string
}

func NewResources(root string) Resources {
	return Resources{root: root}
}

func (r Resources) Supported() bool {
	return r.root != ""
}

// resolve maps a requested name onto a path inside the root, and refuses
// anything that would leave it.
//
// The name arrives as a query parameter precisely because it may contain
// slashes, so `../` is a shape the contract invites and this has to reject. The
// check is on the cleaned absolute path rather than on the text, because
// spelling traversal is far easier than enumerating its spellings.
func (r Resources) resolve(name string) (string, bool) {
	if r.root == "" || name == "" {
		return "", false
	}

	root, err := filepath.Abs(r.root)
	if err != nil {
		return "", false
	}

	ret := filepath.Join(root, filepath.Clean("/"+name))

	if ret != root && !strings.HasPrefix(ret, root+string(filepath.Separator)) {
		return "", false
	}

	return ret, true
}

func (s *Server) getResource(w http.ResponseWriter, r *http.Request) {
	if !s.config.Resources.Supported() {
		notImplemented(w, r)

		return
	}

	path, ok := s.config.Resources.resolve(r.URL.Query().Get("name"))

	if !ok {
		w.WriteHeader(http.StatusNotFound)

		return
	}

	content, err := os.ReadFile(path)

	// Missing is an ordinary answer — the runtime reports the resource as
	// absent and carries on — and so is a name that turned out to be a
	// directory. Neither is worth a 500.
	if err != nil {
		w.WriteHeader(http.StatusNotFound)

		return
	}

	w.Header().Set("content-type", "application/octet-stream")
	_, _ = w.Write(content)
}
