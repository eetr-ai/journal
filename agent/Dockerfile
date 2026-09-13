# The stock octo runtime with our flows baked in, so what a release publishes is
# the integration and not just the engine that would run it.
#
# The base is distroless, already runs as nonroot, and already starts
# `octo run --config /etc/octo/integrations` — so this only fills that directory.
# Pinned: the runtime is somebody else's release train, and a chart that moves
# under us is not a deployment we can reason about.
FROM juancavallotti/octo-runtime:0.11.4

COPY flows/ /etc/octo/integrations/
