# Changelog

## [0.0.7](https://github.com/eetr-ai/journal/compare/v0.0.6...v0.0.7) (2026-09-16)


### Bug Fixes

* the release builds only the architecture we deploy to ([#25](https://github.com/eetr-ai/journal/issues/25)) ([0ea3877](https://github.com/eetr-ai/journal/commit/0ea38776831f72985771e0caeb8b4dce45975c80))

## [0.0.6](https://github.com/eetr-ai/journal/compare/v0.0.5...v0.0.6) (2026-09-16)


### Features

* search the journal, navigate it by day, and throw entries away ([#22](https://github.com/eetr-ai/journal/issues/22)) ([8b06fd6](https://github.com/eetr-ai/journal/commit/8b06fd6648a965910c66be6db719adf8b3cfc900))
* start an entry yourself, and keep the ones worth keeping ([#23](https://github.com/eetr-ai/journal/issues/23)) ([bb644c3](https://github.com/eetr-ai/journal/commit/bb644c3ee0dbba66695baa50e39cbb3e6f3c7173))
* the journal finds the paragraph, not the whole day ([#21](https://github.com/eetr-ai/journal/issues/21)) ([08f2116](https://github.com/eetr-ai/journal/commit/08f211622f2c63b2d933151a852b3828601deaa2))


### Bug Fixes

* the schema stops trying to create the vector extension ([#19](https://github.com/eetr-ai/journal/issues/19)) ([44142b6](https://github.com/eetr-ai/journal/commit/44142b6eddf08b996817d690bddac5b603b692e2))

## [0.0.5](https://github.com/eetr-ai/journal/compare/v0.0.4...v0.0.5) (2026-09-16)


### Features

* tell the CI to roll out the chart we just published ([#13](https://github.com/eetr-ai/journal/issues/13)) ([c285059](https://github.com/eetr-ai/journal/commit/c2850590080f8fff3d778b530d62fd4f83515dbb))
* the agent remembers, and the chat panel is real ([#15](https://github.com/eetr-ai/journal/issues/15)) ([0132709](https://github.com/eetr-ai/journal/commit/0132709458dbf5b9d4c982676afd462f61ed5d52))
* the journal gets entries the agent writes, finds and reaches back into ([#16](https://github.com/eetr-ai/journal/issues/16)) ([754c5ce](https://github.com/eetr-ai/journal/commit/754c5ce7cd4af6cc7e01a1cf199418840a0e5690))

## [0.0.4](https://github.com/eetr-ai/journal/compare/v0.0.3...v0.0.4) (2026-09-14)


### Features

* apply the schema from the chart, before the pods ([#9](https://github.com/eetr-ai/journal/issues/9)) ([f1903a8](https://github.com/eetr-ai/journal/commit/f1903a80c3efffdac179cc3247d43d14cf5ca21b))


### Bug Fixes

* keep the schema in sql/, and ship it as an image ([#12](https://github.com/eetr-ai/journal/issues/12)) ([bc018de](https://github.com/eetr-ai/journal/commit/bc018de1da019881dd4ab0383d0edcb2aeb57c55))

## [0.0.3](https://github.com/eetr-ai/journal/compare/v0.0.2...v0.0.3) (2026-09-14)


### Features

* ship the flows as an image, and take the database credential in parts ([#8](https://github.com/eetr-ai/journal/issues/8)) ([238ef23](https://github.com/eetr-ai/journal/commit/238ef23a97fc2bc7d314bdf9c45bc6493badb4bb))


### Bug Fixes

* publish the release artifacts from the run that cuts the tag ([#6](https://github.com/eetr-ai/journal/issues/6)) ([9a3d650](https://github.com/eetr-ai/journal/commit/9a3d650820bac5b2f5f42517499f519d3dded549))

## [0.0.2](https://github.com/eetr-ai/journal/compare/v0.0.1...v0.0.2) (2026-09-13)


### Features

* bootstrap the journal monorepo ([3c4a81c](https://github.com/eetr-ai/journal/commit/3c4a81cb71831bedf399a8a0d486ea89db3a67da))
* deploy with Gateway API and an external database ([#4](https://github.com/eetr-ai/journal/issues/4)) ([368efcc](https://github.com/eetr-ai/journal/commit/368efcc25c70e63846d69d8289440e3ae4071383))
* OIDC sign-in, user profiles, and an encrypted journal ([#3](https://github.com/eetr-ai/journal/issues/3)) ([d9b801b](https://github.com/eetr-ai/journal/commit/d9b801bb7a16a8497c2819e8b0d3096bf35ec127))
* run the agent as an http service with hot reload ([#2](https://github.com/eetr-ai/journal/issues/2)) ([8b81d24](https://github.com/eetr-ai/journal/commit/8b81d24f9ba3b10f13fd0689633e0f0a348e1102))
