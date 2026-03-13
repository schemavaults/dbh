# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@schemavaults/dbh` is an npm package that provides a Kysely-based adapter for connecting to Postgres databases through a Neon-compatible WebSocket proxy. It works with both Neon-hosted serverless Postgres and local Postgres instances (via a bundled WS proxy).

## Commands

Ensure dependencies are installed with `bun install` before attempting to run any other commands.

- **Build:** `bun run build` (runs tsc + tsc-alias, then cleans test files from dist/)
- **Lint:** `bun run lint` (eslint on src/)
- **Unit tests:** `bun run test` or `bun run test:unit`
- **Single test:** `bun test --test-name-pattern '<pattern>'`
- **E2E tests:** `cd tests && /bin/bash ./run_e2e_tests.sh` (requires Docker Compose — spins up postgres, ws-proxy, and test-runner containers)
- **CLI:** `bun run cli --help` locally or `bunx @schemavaults/dbh --help` remotely.

## Architecture

The core adapter is `SchemaVaultsPostgresNeonProxyAdapter<T>` (generic over Kysely table types). It wraps Kysely with a `NeonDialect` and handles credential parsing, WS proxy URL resolution, and debug logging. Consumers extend or instantiate it, passing an environment (`development|test|staging|production`), optional credentials (defaults to env vars), and an optional `wsProxyUrl` (string or generator function).

Key modules:
- `src/schemavaults-postgres-neon-proxy-adapter.ts` — the main adapter class
- `src/migrate.ts` — Kysely migration helpers (`migrate`, `reverse`), exported as a separate entrypoint (`@schemavaults/dbh/migrate`)
- `src/sql.ts` — re-exports Kysely's `sql` tag
- `src/utils/parseDatabaseCredentials.ts` — parses/validates DB credentials from an object or `process.env`

The package has two export entrypoints: `.` (adapter + sql + types), `./sql` (Kysely template tag re-export), `./migrate` (migration utilities), and `./cli` (@schemavaults/dbh command-line utility).

## Local Dev Environment

- Runtime/package manager: **Bun** (v1.3.6)
- TypeScript with path alias `@/*` → `src/*` (resolved by tsc-alias at build time)
- E2E tests run inside Docker containers (postgres:17.7 + a Go-based WS proxy on port 5433)

## Environment Variables

The adapter reads these from `process.env` when credentials aren't passed directly:
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` (optional), `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`. Debug mode via `SCHEMAVAULTS_DBH_DEBUG=true`.
