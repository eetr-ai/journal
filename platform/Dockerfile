# syntax=docker/dockerfile:1
# The platform sidecar: the octo platform API, backed by Postgres and Redis.
#
# Build context is this directory, which is the Go module's root:
#   docker build -t journal-platform:local platform
FROM golang:1.27-alpine AS build
WORKDIR /src

# The manifests first, so a change to the code does not re-download the module
# cache.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

ARG VERSION=dev
# -s -w strip the symbol table and DWARF debug info. CGO off because the final
# stage has no libc to link against.
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags "-s -w -X main.Version=${VERSION}" \
    -o /out/journal-platform .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/journal-platform /usr/local/bin/journal-platform
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/journal-platform"]
