package api

import (
	"errors"
	"io"
	"io/fs"
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

// named refuses a name that is a path rather than a name.
//
// The name arrives as a query parameter precisely because it may contain
// slashes, so `..` is a shape the contract invites. It is refused rather than
// normalized away: cleaning `../skills/x` leaves `skills/x`, which quietly
// serves a real resource to a caller that asked for something else.
func named(name string) bool {
	if name == "" || filepath.IsAbs(name) || filepath.VolumeName(name) != "" {
		return false
	}

	for _, part := range strings.Split(filepath.ToSlash(name), "/") {
		if part == ".." {
			return false
		}
	}

	return true
}

// read returns the resource's bytes. A name that is not there — or is not a
// file — comes back as fs.ErrNotExist, and everything else is a real failure
// that must not be mistaken for one.
//
// os.Root does the confinement rather than a prefix check on the joined path,
// because a prefix check is lexical and os.ReadFile follows symlinks: a link
// inside the bundle pointing anywhere would otherwise be served.
func (r Resources) read(name string) ([]byte, error) {
	if !r.Supported() || !named(name) {
		return nil, fs.ErrNotExist
	}

	root, err := os.OpenRoot(r.root)
	if err != nil {
		return nil, err
	}

	defer func() { _ = root.Close() }()

	info, err := root.Lstat(name)
	if err != nil {
		return nil, err
	}

	// A symlink is refused outright rather than followed and then judged. The
	// bundle is a directory baked into an image, so there is no such thing as a
	// legitimate link in it, and "refuse the shape" is a rule that holds without
	// having to be right about where each link points.
	if info.IsDir() || info.Mode()&fs.ModeSymlink != 0 {
		return nil, fs.ErrNotExist
	}

	file, err := root.Open(name)
	if err != nil {
		return nil, err
	}

	defer func() { _ = file.Close() }()

	return io.ReadAll(file)
}

func (s *Server) getResource(w http.ResponseWriter, r *http.Request) {
	if !s.config.Resources.Supported() {
		notImplemented(w, r)

		return
	}

	content, err := s.config.Resources.read(r.URL.Query().Get("name"))

	// Missing is an ordinary answer: the runtime reports the resource as absent
	// and carries on. A volume that will not read is not that, and answering
	// 404 for it would present a broken mount as an integration with no skills.
	switch {
	case errors.Is(err, fs.ErrNotExist):
		w.WriteHeader(http.StatusNotFound)

		return
	case err != nil:
		s.fail(w, err, "read resource")

		return
	}

	w.Header().Set("content-type", "application/octet-stream")
	_, _ = w.Write(content)
}
