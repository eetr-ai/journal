# The schema, with a psql to apply it. Built for the same reason the agent image
# is: what a release needs at install time travels with the release, rather than
# being applied beside it by somebody who remembered.
FROM postgres:17-alpine

COPY *.sql /schema/
