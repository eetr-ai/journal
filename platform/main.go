// Command journal-platform is the octo platform API for this app, run as a
// sidecar beside the runtime. It answers one HTTP contract and keeps what is
// behind it in two places: Postgres for what an agent remembers, Redis for
// exclusive claims and for messages in flight.
//
// It listens on loopback only. The runtime shares its network namespace and is
// the only thing that has any business calling it, so there is no token here
// and no route that would need one.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/eetr-ai/journal/platform/internal/api"
	"github.com/eetr-ai/journal/platform/internal/backfill"
	"github.com/eetr-ai/journal/platform/internal/bus"
	"github.com/eetr-ai/journal/platform/internal/embed"
	"github.com/eetr-ai/journal/platform/internal/locks"
	"github.com/eetr-ai/journal/platform/internal/seal"
	"github.com/eetr-ai/journal/platform/internal/store"
)

const (
	defaultHost  = "127.0.0.1"
	defaultPort  = "8099"
	defaultModel = "qwen/qwen3-embedding-8b"
	// dimensions is a deliberate truncation of a wider model: pgvector indexes
	// nothing past 2000, and the column has to match what we ask for.
	dimensions = 1024

	readHeaderTimeout = 10 * time.Second
	readTimeout       = 30 * time.Second
	// writeTimeout has to clear the longest poll the runtime will ask for, or
	// the server cuts its own long polls short and the loop busies.
	writeTimeout    = 90 * time.Second
	idleTimeout     = 120 * time.Second
	shutdownTimeout = 10 * time.Second
	startupTimeout  = 15 * time.Second
	// ackDeadline is how long a delivery stays invisible before it is taken
	// back from a consumer that never settled it.
	ackDeadline = 60 * time.Second
)

// Version is stamped at build time and reported in discovery.
var Version = "dev"

type config struct {
	addr        string
	dsn         string
	redisURL    string
	instance    string
	embedAPIKey string
	embedModel  string
	secretsKey  string
}

func envOr(name, fallback string) string {
	if ret := os.Getenv(name); ret != "" {
		return ret
	}

	return fallback
}

// loadConfig reads the environment and lists everything missing at once, so one
// restart reveals all of it rather than one value per attempt.
func loadConfig() (config, error) {
	ret := config{
		addr:        envOr("HOST", defaultHost) + ":" + envOr("PORT", defaultPort),
		dsn:         os.Getenv("POSTGRES_DSN"),
		redisURL:    os.Getenv("REDIS_URL"),
		instance:    envOr("OCTO_INSTANCE_ID", defaultInstance()),
		embedAPIKey: os.Getenv("OPENROUTER_API_KEY"),
		embedModel:  envOr("EMBEDDING_MODEL", defaultModel),
		secretsKey:  os.Getenv("SECRETS_KEY"),
	}

	var missing []string

	if ret.dsn == "" {
		missing = append(missing, "POSTGRES_DSN")
	}

	if ret.redisURL == "" {
		missing = append(missing, "REDIS_URL")
	}

	if len(missing) > 0 {
		return config{}, fmt.Errorf("missing required environment: %v", missing)
	}

	return ret, nil
}

func defaultInstance() string {
	host, err := os.Hostname()
	if err != nil {
		host = "unknown"
	}

	return fmt.Sprintf("%s-%d", host, os.Getpid())
}

// load builds the object graph and says what it is doing on the way, because
// the first thing anyone wants from a container that will not start is which
// step it got to.
func load(ctx context.Context, cfg config, log *slog.Logger) (*api.Server, *backfill.Worker, func(), error) {
	log.Info("Connecting to Postgres...")

	pg, err := store.NewPgStore(ctx, cfg.dsn)
	if err != nil {
		return nil, nil, nil, err
	}

	log.Info("Connecting to Redis...")

	options, err := redis.ParseURL(cfg.redisURL)
	if err != nil {
		pg.Close()

		return nil, nil, nil, fmt.Errorf("redis url: %w", err)
	}

	client := redis.NewClient(options)

	if err := client.Ping(ctx).Err(); err != nil {
		pg.Close()
		_ = client.Close()

		return nil, nil, nil, fmt.Errorf("redis unreachable: %w", err)
	}

	log.Info("Building the embedder...", "model", cfg.embedModel)

	// No key is not a failure: search falls back to text matching and discovery
	// says so, which is what makes a local run with no account work.
	var embedder embed.Embedder = embed.NoopEmbedder{}

	if cfg.embedAPIKey != "" {
		embedder = embed.NewOpenRouter(cfg.embedAPIKey, cfg.embedModel, dimensions)
	} else {
		log.Warn("no OPENROUTER_API_KEY: memory search will match text rather than meaning")
	}

	// Sealing is a decorator, so a deployment with no key configured simply
	// does not build one — and discovery then says the secrets namespaces are
	// in the clear rather than claiming otherwise.
	var entries store.Store = pg
	sealed := false

	if cfg.secretsKey != "" {
		sealer, err := seal.New(cfg.secretsKey)
		if err != nil {
			pg.Close()
			_ = client.Close()

			return nil, nil, nil, err
		}

		entries = store.NewSealed(pg, sealer)
		sealed = true
	} else {
		log.Warn("no SECRETS_KEY: octo's secrets namespaces will be stored in the clear")
	}

	server := api.NewServer(api.Config{
		Store:         entries,
		Locks:         locks.NewRedisLocks(client),
		Bus:           bus.NewRedisBus(client, cfg.instance, ackDeadline),
		Embedder:      embedder,
		Name:          "journal-platform",
		Version:       Version,
		SecretsSealed: sealed,
		Log:           log,
	})

	return server, backfill.New(entries, embedder, log), func() {
		pg.Close()
		_ = client.Close()
	}, nil
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	slog.SetDefault(log)

	if err := run(log); err != nil {
		log.Error("journal-platform stopped with error", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}

	log.Info("Reading environment variables...", "addr", cfg.addr, "instance", cfg.instance)

	startup, cancel := context.WithTimeout(context.Background(), startupTimeout)
	defer cancel()

	server, worker, release, err := load(startup, cfg, log)
	if err != nil {
		return err
	}
	defer release()

	listener := &http.Server{
		Addr:              cfg.addr,
		Handler:           server.Handler(),
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	return serve(listener, worker, log)
}

func serve(server *http.Server, worker *backfill.Worker, log *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// The backfill lives as long as the server does and stops with it. Rows it
	// has not reached yet are still pending, which is the whole point.
	go worker.Run(ctx)

	failed := make(chan error, 1)

	go func() {
		log.Info("Serving the platform API...", "addr", server.Addr)

		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			failed <- err
		}
	}()

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
	}

	log.Info("Draining...")

	drain, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	return server.Shutdown(drain)
}
