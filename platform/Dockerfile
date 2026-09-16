# syntax=docker/dockerfile:1
# The platform sidecar: the octo platform API, backed by Postgres and Redis.
#
# Build context is the REPO ROOT, not this directory: the sidecar answers the
# runtime's requests for the integration's own resources, so it has to carry
# them, and they live beside the flows that name them.
#
#   docker build -f platform/Dockerfile -t journal-platform:local .
FROM golang:1.27-alpine AS build
WORKDIR /src

# The manifests first, so a change to the code does not re-download the module
# cache.
COPY platform/go.mod platform/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY platform/ .

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

# The integration's resources, at the path the runtime beside us reads its own
# flows from — so a resource resolves to the same name on both sides of the
# platform API, and the sidecar is loading them as if they were local to the
# integration. A shared volume would be truer, but populating one needs an
# init container with something to copy WITH, and both images are distroless.
#
# Only the resources, not the flows: what is served here is what a skill or a
# template asks for by name, and the flows are the runtime's business.
COPY agent/flows/skills /etc/octo/integrations/skills
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/journal-platform"]
