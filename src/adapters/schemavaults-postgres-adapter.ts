// schemavaults-postgres-adapter.ts
// This file sets up kysely to connect to postgres

import type { IDatabaseHandler } from "@/types/IDatabaseHandler";
import parsePort from "@/utils/parsePort";
import type { IAbstractSchemaVaultsDbhAdapterConstructorOpts } from "@/adapters/abstract-schemavaults-dbh-adapter";
import AbstractSchemaVaultsDbhAdapter from "@/adapters/abstract-schemavaults-dbh-adapter";
import {
  PostgresDialect,
  type PostgresDialectConfig,
  type Dialect,
} from "kysely";
import { Pool } from "pg";

export interface ISchemaVaultsPostgresAdapterConstructorOpts extends IAbstractSchemaVaultsDbhAdapterConstructorOpts {}

export class SchemaVaultsPostgresAdapter<KyselyTablesType extends object>
  extends AbstractSchemaVaultsDbhAdapter<
    KyselyTablesType,
    ISchemaVaultsPostgresAdapterConstructorOpts
  >
  implements IDatabaseHandler<KyselyTablesType>
{
  protected initializeDbDialect(): Dialect {
    const credentials = this.credentials;
    const postgres_dialect_conig: PostgresDialectConfig = {
      pool: async () =>
        new Pool({
          database: credentials.POSTGRES_DATABASE satisfies string,
          host: credentials.POSTGRES_HOST satisfies string,
          user: credentials.POSTGRES_USER satisfies string,
          password: credentials.POSTGRES_PASSWORD satisfies string,
          port: parsePort(credentials.POSTGRES_PORT) satisfies number,
          connectionString: credentials.POSTGRES_URL satisfies string,
        }),
    };

    const dialect: Dialect = new PostgresDialect(postgres_dialect_conig);
    return dialect;
  }

  public constructor(opts: ISchemaVaultsPostgresAdapterConstructorOpts) {
    super(opts);
    if (this.debug) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initialized SchemaVaults x Kysely x Neon database adapter in environment: ",
        this.env,
      );
    }
  }
}

export default SchemaVaultsPostgresAdapter;
