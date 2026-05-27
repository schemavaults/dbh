// create-dbh.ts

import type { IDatabaseHandler } from "@/types/IDatabaseHandler";
import type { IAbstractSchemaVaultsDbhAdapterConstructorOpts } from "@/adapters/abstract-schemavaults-dbh-adapter";
import type {
  SchemaVaultsPostgresAdapter,
  ISchemaVaultsPostgresAdapterConstructorOpts,
} from "@/adapters/schemavaults-postgres-adapter";
import type {
  SchemaVaultsPostgresNeonProxyAdapter,
  ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
} from "@/adapters/schemavaults-postgres-neon-proxy-adapter";

const ADAPTER_MAP = {
  postgres: async () =>
    await import("@/adapters/schemavaults-postgres-adapter").then(
      (mod) => mod.SchemaVaultsPostgresAdapter,
    ),
  "postgres-neon-proxy": async () =>
    await import("@/adapters/schemavaults-postgres-neon-proxy-adapter").then(
      (mod) => mod.SchemaVaultsPostgresNeonProxyAdapter,
    ),
} as const;

type AdapterKey = keyof typeof ADAPTER_MAP;

/**
 * Asynchronously construct a SchemaVaults database handler for the given
 * adapter type, dynamically importing only the adapter that was requested.
 *
 * The returned instance implements `Symbol.asyncDispose`, so it is designed
 * to be used with TC39 explicit-resource-management (`await using`) — the
 * underlying Kysely connection pool is destroyed automatically when the
 * binding goes out of scope.
 *
 * @template KyselyTablesType - The Kysely table-types interface describing
 * the schema of the target database.
 *
 * @param adapter_type - Discriminator selecting which adapter to instantiate:
 *   - `"postgres"` — direct Postgres connection via `pg` Pool.
 *   - `"postgres-neon-proxy"` — Postgres connection tunneled through a
 *     Neon-compatible WebSocket proxy (serverless/edge-friendly).
 * @param opts - Adapter-specific constructor options. The shape is narrowed
 *   per-overload to match the chosen `adapter_type`.
 *
 * @returns A Promise resolving to a ready-to-use adapter instance whose
 *   concrete type is narrowed per-overload.
 *
 * @example Direct Postgres connection
 * ```ts
 * import createDbh from "@schemavaults/dbh/create-dbh";
 * import type { DB } from "./db-types";
 *
 * await using dbh = await createDbh<DB>("postgres", {
 *   environment: "development",
 * });
 * const users = await dbh.db.selectFrom("users").selectAll().execute();
 * ```
 *
 * @example Neon WebSocket proxy with custom proxy URL
 * ```ts
 * await using dbh = await createDbh<DB>("postgres-neon-proxy", {
 *   environment: "production",
 *   wsProxyUrl: ({ pg_host }) => `wss://proxy.example.com/${pg_host}/v1`,
 * });
 * ```
 *
 * @example Explicit credentials instead of process.env
 * ```ts
 * await using dbh = await createDbh<DB>("postgres", {
 *   environment: "test",
 *   credentials: {
 *     POSTGRES_HOST: "localhost",
 *     POSTGRES_PORT: "5432",
 *     POSTGRES_USER: "postgres",
 *     POSTGRES_PASSWORD: "postgres",
 *     POSTGRES_DATABASE: "schemavaults_test",
 *   },
 * });
 * ```
 *
 * @see {@link SchemaVaultsPostgresAdapter} — adapter loaded when
 *   `adapter_type === "postgres"`.
 * @see {@link SchemaVaultsPostgresNeonProxyAdapter} — adapter loaded when
 *   `adapter_type === "postgres-neon-proxy"`.
 */
export default async function createDbh<KyselyTablesType extends object>(
  adapter_type: "postgres",
  opts: ISchemaVaultsPostgresAdapterConstructorOpts,
): Promise<SchemaVaultsPostgresAdapter<KyselyTablesType>>;
/**
 * @see {@link SchemaVaultsPostgresNeonProxyAdapter}
 */
export default async function createDbh<KyselyTablesType extends object>(
  adapter_type: "postgres-neon-proxy",
  opts: ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
): Promise<SchemaVaultsPostgresNeonProxyAdapter<KyselyTablesType>>;
export default async function createDbh<KyselyTablesType extends object>(
  adapter_type: AdapterKey,
  opts: IAbstractSchemaVaultsDbhAdapterConstructorOpts,
): Promise<IDatabaseHandler<KyselyTablesType>> {
  if (typeof adapter_type !== "string") {
    throw new TypeError(`Invalid adapter type '${typeof adapter_type}'`);
  }
  const adapter_loader = ADAPTER_MAP[adapter_type];
  if (typeof adapter_loader !== "function") {
    throw new TypeError(
      `Failed to load database adapter loader for type '${adapter_type}'`,
    );
  }
  const AdapterClass = (await adapter_loader()) as new (
    o: IAbstractSchemaVaultsDbhAdapterConstructorOpts,
  ) => IDatabaseHandler<KyselyTablesType>;
  return new AdapterClass(opts);
}
