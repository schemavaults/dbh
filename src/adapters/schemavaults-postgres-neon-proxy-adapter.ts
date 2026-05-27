// schemavaults-postgres-neon-proxy-adapter.ts
// This file sets up kysely to connect to postgres via a Neon websocket proxy
// (allows database usage from a serverless/edge environment)

import { NeonDialect } from "kysely-neon";
import type { SchemaVaultsAppEnvironment } from "@/types/SchemaVaultsAppEnvironment";
import getPostgresNeonWsProxyUrl, {
  type WsProxyUrlGenerator,
  type IGetPostgresNeonWsProxyUrlOpts,
} from "@/utils/getPostgresNeonWsProxyUrl";
import type { IDatabaseHandler } from "@/types/IDatabaseHandler";
import parsePort from "@/utils/parsePort";
import type { IAbstractSchemaVaultsDbhAdapterConstructorOpts } from "@/adapters/abstract-schemavaults-dbh-adapter";
import AbstractSchemaVaultsDbhAdapter from "@/adapters/abstract-schemavaults-dbh-adapter";
import type { Dialect } from "kysely";

type NeonDialectConfig = ConstructorParameters<typeof NeonDialect>[0];

export interface ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts extends IAbstractSchemaVaultsDbhAdapterConstructorOpts {
  /**
   * @description Pass a custom function, it will receive an object containing the 'pg_host' and 'environment' and should output the endpoint of the proxy to use
   * @example given { pg_host: 'localhost', environment: 'development' } it might return => 'localhost:5433/v1'
   */
  wsProxyUrl?: WsProxyUrlGenerator | string;
}

export class SchemaVaultsPostgresNeonProxyAdapter<
  KyselyTablesType extends object,
>
  extends AbstractSchemaVaultsDbhAdapter<
    KyselyTablesType,
    ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts
  >
  implements IDatabaseHandler<KyselyTablesType>
{
  protected initializeDbDialect(
    opts: Omit<
      ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
      "credentials"
    >,
  ): Dialect {
    const debug: boolean = this.debug;
    const environment: SchemaVaultsAppEnvironment = this.env;
    const credentials = this.credentials;
    const kysely_neon_dialect_config: NeonDialectConfig = {
      connectionString: credentials.POSTGRES_URL satisfies string,
      host: credentials.POSTGRES_HOST satisfies string,
      user: credentials.POSTGRES_USER satisfies string,
      password: credentials.POSTGRES_PASSWORD satisfies string,
      database: credentials.POSTGRES_DATABASE satisfies string,
      useSecureWebSocket: (this.env === "production") satisfies boolean,
      port: parsePort(credentials.POSTGRES_PORT) satisfies number,
      wsProxy: (pg_host: string): string => {
        if (debug) {
          console.log(
            `[SchemaVaultsPostgresNeonProxyAdapter] NeonDialectConfig.wsProxy("${pg_host}")`,
          );
        }
        // Calculate the wsProxy url from host
        let resolvedWsProxyUrl: string;
        try {
          const wsProxyUrlGeneratorSettings: IGetPostgresNeonWsProxyUrlOpts = {
            pg_host,
            environment,
            debug: this.debug,
          };

          if (typeof opts.wsProxyUrl === "undefined" || !opts.wsProxyUrl) {
            // Default ws proxy URL generator
            resolvedWsProxyUrl = getPostgresNeonWsProxyUrl(
              wsProxyUrlGeneratorSettings,
            );
          } else if (
            typeof opts.wsProxyUrl === "string" &&
            opts.wsProxyUrl &&
            opts.wsProxyUrl.length > 0
          ) {
            resolvedWsProxyUrl = opts.wsProxyUrl;
          } else if (typeof opts.wsProxyUrl === "function" && opts.wsProxyUrl) {
            const wsProxyUrlBuilder: WsProxyUrlGenerator = opts.wsProxyUrl;
            resolvedWsProxyUrl = wsProxyUrlBuilder(wsProxyUrlGeneratorSettings);
          } else {
            throw new Error(
              `Invalid wsProxy url for host: "${pg_host}". Not a string, undefined, or function!`,
            );
          }
        } catch (error: unknown) {
          console.error(
            `[SchemaVaultsPostgresNeonProxyAdapter] NeonDialectConfig.wsProxy("${pg_host}") => Failure: `,
            error,
          );
          throw new Error(
            `Failed to calculate wsProxy url for host: "${pg_host}"`,
          );
        }

        if (this.debug) {
          console.log(
            `[SchemaVaultsPostgresNeonProxyAdapter] NeonDialectConfig.wsProxy("${pg_host}") => `,
            resolvedWsProxyUrl,
          );
        }

        return resolvedWsProxyUrl;
      },
    };

    if (this.debug) {
      kysely_neon_dialect_config.pipelineTLS = false;
      kysely_neon_dialect_config.pipelineConnect = false;
    }

    if (this.debug) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Kysely Neon DB adapter configuration: ",
        kysely_neon_dialect_config,
      );
    }

    const dialect: Dialect = new NeonDialect(kysely_neon_dialect_config);
    return dialect;
  }

  public constructor(
    opts: ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
  ) {
    super(opts);
    if (this.debug) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initialized SchemaVaults x Kysely x Neon database adapter in environment: ",
        this.env,
      );
    }
  }
}

export default SchemaVaultsPostgresNeonProxyAdapter;

export type {
  WsProxyUrlGenerator,
  IGetPostgresNeonWsProxyUrlOpts,
} from "@/utils/getPostgresNeonWsProxyUrl";
