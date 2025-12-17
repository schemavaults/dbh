# @schemavaults/dbh

## About

This package makes it easy to connect to a Postgres instance and run queries using the 'Kysely' type-safe query builder-- whether it's a local Postgres container or a serverless [Neon](https://neon.com/)-hosted Postgres container.

## Highlighted Dependencies

- [kysely](https://www.kysely.dev/) - TypeScript SQL query builder ([GitHub Repo](https://github.com/kysely-org/kysely))
- [neon](https://neon.com/) - Serverless Postgres ([@neondatabase/serverless driver GitHub Repo](https://github.com/neondatabase/serverless))
- [kysely-neon](https://github.com/seveibar/kysely-neon) - Kysely Dialect for using @neondatabase/serverless

## Usage

While `@schemavaults/dbh` can be used in development or production, this repository also contains tools to run your postgres database locally.

### In your docker-compose.yml

Ensure that you have both `postgres` and a `postgres-ws-proxy` containers running with Docker. For an example, see the e2e test `docker-compose.yml` file: [./tests/docker-compose.yml](./tests/docker-compose.yml)

You'll likely want to replace the `build:` sections for the services in the e2e test example `.yml` file with `image:`. For example, use `image: postgres:17.7` for the `postgres` service. For the proxy, you can pull the docker image from `ghcr.io/schemavaults/dbh/postgres-ws-proxy`; use the version number equal to your `@schemavaults/dbh` npm package installation:
```md
# NPM Package: @schemavaults/dbh@0.7.0 => ghcr.io/schemavaults/dbh/postgres-ws-proxy:0.7.0
```

### In your application server code

Set up an adapter.

For an example, see the e2e test file: [./src/tests/e2e/ConnectToLocalDatabase.test.ts](./src/tests/e2e/ConnectToLocalDatabase.test.ts)

You may need to define a custom `WsProxyUrlGenerator` function to determine how the `postgres-ws-proxy` can be reached.

## Required Environment Variables

Ensure that the following environment variables are defined:
```bash
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_URL=""
POSTGRES_URL_NON_POOLING=""
POSTGRES_HOST=""
POSTGRES_PORT="5432"
POSTGRES_DATABASE=""
```

## Examples / Integration Tests

See the [`tests` docker-compose.yml](./tests/docker-compose.yml) file for an example of:
- a [postgres container](./postgres/Dockerfile) (runs on port `5432`).
- a [postgres-ws-proxy container](./postgres-ws-proxy/Dockerfile); that proxies HTTP traffic to the Postgres container via custom TCP protocol (runs on port `5433`).
- a [test container](./tests/Dockerfile), that uses the `@schemavaults/dbh` package to execute test queries in this containerized database setup.

If you have [docker compose](https://docs.docker.com/compose/) installed you can use the helper script to run the tests:
```bash
cd ./tests && /bin/bash ./run_e2e_tests.sh
```

## GitHub Repository

[https://github.com/schemavaults/dbh](https://github.com/schemavaults/dbh)
