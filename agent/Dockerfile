# The agent image: octo with our flows in it.
#
# The `octo-api` flavour, not `octo-runtime`: the runtime's services provider is
# a build tag, and this one delegates storage, leases and agent memory to the
# platform API the sidecar beside it answers. Same entrypoint, same distroless
# nonroot base, same `octo run --config /etc/octo/integrations`.
#
# The runtime version is pinned here, which makes it the one place that says
# which octo a release of this app is a release of.
FROM juancavallotti/octo-api:0.11.6

COPY flows/ /etc/octo/integrations/
