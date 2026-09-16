// Package embed turns text into the vectors search ranks by.
package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Embedder is how this sidecar gets a vector. Two implementations ship:
// OpenRouterEmbedder, and NoopEmbedder for every run with no key configured.
type Embedder interface {
	// Embed returns one vector per input, in the same order. A nil vector in
	// the result is an honest "no embedding for this", not an error.
	Embed(ctx context.Context, texts []string) ([][]float32, error)

	// Semantic says whether vectors are actually produced, so discovery can
	// tell the runtime what kind of search it is getting.
	Semantic() bool
}

// NoopEmbedder is the null object: it produces nothing, so search falls back to
// text matching. That is a degradation rather than a failure, which is what
// makes an unconfigured local run and an unconfigured test both work.
type NoopEmbedder struct{}

func (NoopEmbedder) Embed(_ context.Context, texts []string) ([][]float32, error) {
	return make([][]float32, len(texts)), nil
}

func (NoopEmbedder) Semantic() bool { return false }

const (
	defaultBaseURL = "https://openrouter.ai/api/v1"
	requestTimeout = 30 * time.Second
)

// OpenRouterEmbedder talks to OpenRouter's OpenAI-compatible embeddings route.
type OpenRouterEmbedder struct {
	client     *http.Client
	baseURL    string
	apiKey     string
	model      string
	dimensions int
}

// NewOpenRouter builds the embedder. `dimensions` is a deliberate truncation:
// the model is wider than pgvector will index, and the column has to match.
func NewOpenRouter(apiKey, model string, dimensions int) *OpenRouterEmbedder {
	return &OpenRouterEmbedder{
		client:     &http.Client{Timeout: requestTimeout},
		baseURL:    defaultBaseURL,
		apiKey:     apiKey,
		model:      model,
		dimensions: dimensions,
	}
}

func (OpenRouterEmbedder) Semantic() bool { return true }

type embedRequest struct {
	Model      string   `json:"model"`
	Input      []string `json:"input"`
	Dimensions int      `json:"dimensions,omitempty"`
}

type embedResponse struct {
	Data []struct {
		Index     int       `json:"index"`
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

func (e *OpenRouterEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	body, err := json.Marshal(embedRequest{Model: e.model, Input: texts, Dimensions: e.dimensions})
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	request.Header.Set("content-type", "application/json")
	request.Header.Set("authorization", "Bearer "+e.apiKey)

	response, err := e.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("embeddings: %s", response.Status)
	}

	var decoded embedResponse
	if err := json.NewDecoder(response.Body).Decode(&decoded); err != nil {
		return nil, err
	}

	// Indexed rather than appended: the API documents an index per row, and
	// trusting the array order instead would silently pair a vector with the
	// wrong turn on the day that stops holding.
	ret := make([][]float32, len(texts))

	for _, row := range decoded.Data {
		if row.Index >= 0 && row.Index < len(ret) {
			ret[row.Index] = row.Embedding
		}
	}

	return ret, nil
}
