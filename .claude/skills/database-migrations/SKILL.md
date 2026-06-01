---
name: database-migrations
description: Authoring, building, validating, and running database migrations in the @schemavaults/dbh repo. Use when creating or editing Kysely migration files, when working in a migrations/ directory, when a migration must be built/compiled or applied, or when the user mentions migrations, up()/down(), schema changes, or the dbh CLI's migrate/build-db-migrations/validate-migration-directory commands.
---

# Database Migrations (@schemavaults/dbh)

This repo uses [Kysely](https://kysely.dev/) migrations, applied through the
`dbh` CLI. Migrations are opinionated: every file is a numbered module that
exports an `up()` and a `down()` function. TypeScript source migrations are
**built** to JavaScript first, then **applied** with the CLI.

## Migration file format

Each migration is a single file in a migrations directory (e.g.
`./src/db/migrations/`). The rules are:

1. **The directory is non-empty.**
2. **Each file name is prefixed with a 5-digit migration number**, followed by a
   short kebab-case description, e.g. `00000-template-migration.ts`,
   `00001-create-users-table.ts`. The number defines apply order.
3. **Each module exports an `up(db)` and a `down(db)` function.** `up()` applies
   the change; `down()` must reverse it exactly so migrations can be rolled back.
4. **Migration numbers are unique** — never reuse a number. If two branches both
   add `00040-*.ts`, that collision must be resolved by renumbering one of them
   before merge.

Both `up` and `down` receive a `Kysely<any>` instance and return a `Promise`.

### Example: using the `Kysely<any>` query builder

Prefer the typed query builder for schema operations:

```ts
// 00001-create-users-table.ts
import type { Kysely } from "@schemavaults/dbh";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("user_id", "uuid", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("created_at", "bigint", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("users").execute();
}
```

### Example: using the `sql` template tag

For statements the builder can't express (or raw DDL), import `sql` from
`@/sql` (which re-exports Kysely's `sql` tag) and call `.execute(db)`:

```ts
// 00002-add-users-index.ts
import type { Kysely } from "@schemavaults/dbh";
import { sql } from "@/sql";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS EXAMPLE_SQUIRRELS (
      squirrel_id UUID PRIMARY KEY,
      squirrel_name TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `.execute(db);

  // Always interpolate values via ${...}; the sql tag parameterizes them.
  await sql`CREATE INDEX squirrels_name_idx ON EXAMPLE_SQUIRRELS (squirrel_name);`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS EXAMPLE_SQUIRRELS;`.execute(db);
}
```

> Note: outside the repo, `sql` is imported from `@schemavaults/dbh/sql` instead
> of `@/sql`. The `@/sql` alias only resolves inside this repo's source.

### Empty template migration

A no-op migration is valid (useful as a starting template):

```ts
// 00000-template-migration.ts
import type { Kysely } from "@schemavaults/dbh";

export async function up(
  db: Kysely<any>, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {}

export async function down(
  db: Kysely<any>, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {}
```

## Validating migrations

Before building or applying, assert the directory is well-formed. The
`validate-migration-directory` command checks all four rules above and exits `0`
when valid, non-zero otherwise (good for CI / pre-commit):

```bash
bunx @schemavaults/dbh validate-migration-directory ./src/db/migrations
# locally in this repo:
bun run cli validate-migration-directory ./src/tests/example-migrations
```

It reports each problem with an `[ERROR]`/`[WARN]` prefix:
- empty directory,
- a file missing the 5-digit prefix,
- a module missing `up()` or `down()`,
- duplicate migration numbers (branch collisions).

Treat duplicate numbers as warnings (non-fatal) with `--duplicates-as-warnings`.

## Building migrations

TypeScript migrations must be compiled to JavaScript before they're applied
(the `migrate` step runs on Node and imports `.js`). The `build-db-migrations`
command uses Bun's bundler and also builds the `sql` module the migrations
depend on:

```bash
bunx @schemavaults/dbh build-db-migrations ./src/db/migrations \
  --outdir ./dist/migrations \
  --sql-module ./src/sql.ts \
  --sql-outdir ./dist
# locally in this repo:
bun run cli build-db-migrations ./src/tests/example-migrations \
  --outdir ./tests/tmp/migrations \
  --sql-module ./src/sql.ts \
  --sql-outdir ./tests/tmp
```

Key options:
- `<migrations-src>` — directory of `.ts` migration sources (positional).
- `--outdir <dir>` — where compiled `.js` migrations are written (required).
- `--sql-module <path>` — path to the `sql.ts` module to build alongside (required).
- `--sql-outdir <dir>` — where the built `sql.js` goes (defaults to the parent of `--outdir`).
- `--external <pkg...>` — packages to keep external (default: `@schemavaults/dbh`, `kysely`).

`build-db-migrations` requires `bun` to be on the PATH.

## Running migrations

Apply built migrations with `migrate`, and roll back with `reverse`. Both take
the **built** migration folder and require an `--environment`; credentials come
from `process.env` (or an `--env-file`).

```bash
# Apply all pending migrations (to latest):
npx @schemavaults/dbh migrate ./dist/migrations --environment production --env-file ./.env.production

# Apply up to a specific version (the migration name w/o extension):
npx @schemavaults/dbh migrate ./dist/migrations 00001-create-users-table --environment staging

# Roll back down to a target version:
npx @schemavaults/dbh reverse ./dist/migrations 00000-template-migration --environment staging
```

Options for `migrate` / `reverse`:
- `<folder>` — path to the built migration folder (positional).
- `[version]` / `<version>` — target migration name; `migrate` defaults to latest, `reverse` requires it.
- `-e, --environment <env>` — `development | test | staging | production` (required).
- `--ws-proxy-url <url>` — custom Neon-compatible WebSocket proxy URL.
- `--env-file <path>` — load DB credentials from a `.env` file first.

Each result line prints as `[Up|Down] <migrationName>: <Success|Error|NotExecuted>`.

### Programmatic API

The same operations are available from `@schemavaults/dbh/migrate` for tests or
custom scripts:

```ts
import { migrate, reverse } from "@schemavaults/dbh/migrate";

await migrate({ db: adapter.db, migrationFolder, version /* optional */ });
await reverse({ db: adapter.db, migrationFolder, version });
```

## Typical end-to-end flow

```bash
# 1. Validate the source migrations directory.
bun run cli validate-migration-directory ./src/db/migrations

# 2. Build .ts migrations (+ sql module) to .js.
bun run cli build-db-migrations ./src/db/migrations \
  --outdir ./dist/migrations --sql-module ./src/sql.ts --sql-outdir ./dist

# 3. Apply the built migrations.
npx @schemavaults/dbh migrate ./dist/migrations --environment production --env-file ./.env.production
```

## Required environment variables (for migrate/reverse)

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_URL`, `POSTGRES_HOST`,
`POSTGRES_PORT`, `POSTGRES_DATABASE` (and optional `POSTGRES_URL_NON_POOLING`).
Set `SCHEMAVAULTS_DBH_DEBUG=true` for verbose debug logging.
