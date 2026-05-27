// index.ts

export { default as default, default as createDbh } from "./create-dbh";

// Postgres Neon Proxy Adapter (for use in serverless environments)
export { SchemaVaultsPostgresNeonProxyAdapter } from "@/adapters/schemavaults-postgres-neon-proxy-adapter";
export type {
  WsProxyUrlGenerator,
  IGetPostgresNeonWsProxyUrlOpts,
} from "@/adapters/schemavaults-postgres-neon-proxy-adapter";

// Postgres Adapter (for use in standard Node.js environments)
export { SchemaVaultsPostgresAdapter } from "@/adapters/schemavaults-postgres-adapter";

// Kysely SQL builder + types
export { sql } from "./sql";
export type * from "kysely";
