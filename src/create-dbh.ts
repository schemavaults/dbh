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

export default async function createDbh<KyselyTablesType extends object>(
  adapter_type: "postgres",
  opts: ISchemaVaultsPostgresAdapterConstructorOpts,
): Promise<SchemaVaultsPostgresAdapter<KyselyTablesType>>;
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
