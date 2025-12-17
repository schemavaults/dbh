// This file sets up kysely to connect to postgress

import { NeonDialect } from "kysely-neon";
import { Kysely } from "kysely";
import {
  isValidAppEnvironment,
  type SchemaVaultsAppEnvironment,
} from "@/SchemaVaultsAppEnvironment";
import type { KyselyConfig } from "kysely";
import getPostgresNeonWsProxyUrl, {
  type WsProxyUrlGenerator,
  type IGetPostgresNeonWsProxyUrlOpts,
} from "@/utils/getPostgresNeonWsProxyUrl";
import isDbhInDebugMode from "@/utils/isDbhInDebugMode";
import type {
  BaseInitializablePostgresDatabaseCredentials,
  PostgresDatabaseCredentials,
} from "@/PostgresDatabaseCredentials";
import parseDatabaseCredentialsFromEnv from "@/utils/parseDatabaseCredentialsFromEnv";
import parseDatabaseCredentials from "@/utils/parseDatabaseCredentials";

type NeonDialectConfig = ConstructorParameters<typeof NeonDialect>[0];

export interface ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts {
  /**
   * @description SchemaVaultsAppEnvironment.
   * @example 'development' 'test' 'staging' 'production'
   */
  environment: SchemaVaultsAppEnvironment;

  /**
   * @description PostgresDatabaseCredentials.
   * @default loaded from environment variables if not supplied
   */
  credentials?: BaseInitializablePostgresDatabaseCredentials;

  /**
   * @description Pass a custom function, it will receive an object containing the 'pg_host' and 'environment' and should output the endpoint of the proxy to use
   * @example given { pg_host: 'localhost', environment: 'development' } it might return => 'localhost:5433/v1'
   */
  wsProxyUrl?: WsProxyUrlGenerator | string;
}

export class SchemaVaultsPostgresNeonProxyAdapter<
  KyselyTablesType extends object,
> {
  private readonly kysely_db: Kysely<KyselyTablesType>;
  private readonly env: SchemaVaultsAppEnvironment;
  private readonly debug: boolean;

  private static getPostgresNeonWsProxyUrl(
    opts: IGetPostgresNeonWsProxyUrlOpts,
  ): string {
    return getPostgresNeonWsProxyUrl(opts) satisfies string;
  } // end of getPostgresNeonWsProxyUrl()

  private static parsePort(credentials: PostgresDatabaseCredentials): number {
    const port: number =
      typeof credentials.POSTGRES_PORT === "number"
        ? credentials.POSTGRES_PORT
        : Number.parseInt(credentials.POSTGRES_PORT);

    if (isNaN(port)) {
      throw new Error(`Invalid port number: ${credentials.POSTGRES_PORT}`);
    }
    return port;
  }

  // Initialized from getInstance() (Singleton pattern)
  public constructor({
    environment,
    ...opts
  }: ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts) {
    if (!isValidAppEnvironment(environment)) {
      throw new TypeError("Invalid SCHEMAVAULTS_APP_ENVIRONMENT!");
    }
    this.env = environment satisfies SchemaVaultsAppEnvironment;

    // checks if 'SCHEMAVAULTS_DBH_DEBUG="true"' is set in env vars, or defaults to yes if in dev/test/staging environment
    const debug: boolean = isDbhInDebugMode(this.env);
    this.debug = debug;

    let credentials: PostgresDatabaseCredentials | undefined = undefined;
    if (opts.credentials) {
      if (typeof opts.credentials !== "object") {
        throw new TypeError("'credentials' is truthy but not an object!");
      }
      credentials = parseDatabaseCredentials(opts.credentials, this.debug);
    } else {
      credentials = parseDatabaseCredentialsFromEnv(process.env, this.debug);
    }
    if (!credentials) {
      throw new Error(
        "Failed to parse database credentials from options or environment variables!",
      );
    }

    const kysely_neon_dialect_config: NeonDialectConfig = {
      connectionString: credentials.POSTGRES_URL satisfies string,
      host: credentials.POSTGRES_HOST satisfies string,
      user: credentials.POSTGRES_USER satisfies string,
      password: credentials.POSTGRES_PASSWORD satisfies string,
      database: credentials.POSTGRES_DATABASE satisfies string,
      useSecureWebSocket: (this.env === "production") satisfies boolean,
      port: SchemaVaultsPostgresNeonProxyAdapter.parsePort(
        credentials,
      ) satisfies number,
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
            resolvedWsProxyUrl =
              SchemaVaultsPostgresNeonProxyAdapter.getPostgresNeonWsProxyUrl(
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

    if (this.debug) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initializing SchemaVaults x Kysely x Neon database adapter...",
      );
    }

    const dialect = new NeonDialect(kysely_neon_dialect_config);

    const kysely_configuration: KyselyConfig = {
      dialect,
      log: ["query", "error"],
    };

    this.kysely_db = new Kysely<KyselyTablesType>(kysely_configuration);

    if (this.debug) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initialized SchemaVaults x Kysely x Neon database adapter in environment: ",
        this.env,
      );
    }
  }

  public get db(): Kysely<KyselyTablesType> {
    return this.kysely_db;
  }

  public async destroy(): Promise<void> {
    await this.kysely_db.destroy();
    return;
  }
}

export default SchemaVaultsPostgresNeonProxyAdapter;

export type {
  WsProxyUrlGenerator,
  IGetPostgresNeonWsProxyUrlOpts,
} from "@/utils/getPostgresNeonWsProxyUrl";
