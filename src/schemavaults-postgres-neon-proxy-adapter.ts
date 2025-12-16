// This file sets up kysely to connect to postgress

import { NeonDialect } from "kysely-neon";
import { Kysely } from "kysely";
import type { SchemaVaultsAppEnvironment } from "@/SchemaVaultsAppEnvironment";
import type { KyselyConfig } from "kysely";
import maybeStripQuotes from "@/utils/maybeStripQuotes";
import getPostgresNeonWsProxyUrl, {
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
  environment: SchemaVaultsAppEnvironment;
  credentials?: BaseInitializablePostgresDatabaseCredentials;
}

export class SchemaVaultsPostgresNeonProxyAdapter<
  KyselyTablesType extends object,
> {
  private readonly kysely_db: Kysely<KyselyTablesType>;
  private readonly env: SchemaVaultsAppEnvironment;
  private readonly debug: boolean;

  private static maybeStripQuotes(
    maybeQuotes?: string | undefined,
  ): string | undefined {
    return maybeStripQuotes(maybeQuotes);
  }

  private static getPostgresNeonWsProxyUrl(
    opts: IGetPostgresNeonWsProxyUrlOpts,
  ): string {
    return getPostgresNeonWsProxyUrl(opts) satisfies string;
  } // end of getPostgresNeonWsProxyUrl()

  // Initialized from getInstance() (Singleton pattern)
  public constructor(
    opts: ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
  ) {
    const environment: SchemaVaultsAppEnvironment = opts.environment;
    this.env = environment;

    // checks if 'SCHEMAVAULTS_DBH_DEBUG="true"' is set in env vars, or defaults to yes if in dev/test/staging environment
    this.debug = isDbhInDebugMode(this.env);
    const debug: boolean = this.debug;

    let credentials: PostgresDatabaseCredentials | undefined = undefined;
    if (opts.credentials) {
      credentials = parseDatabaseCredentials(opts.credentials, debug);
    } else {
      credentials = parseDatabaseCredentialsFromEnv(process.env, debug);
    }

    const port: number =
      typeof credentials.POSTGRES_PORT === "number"
        ? credentials.POSTGRES_PORT
        : Number.parseInt(credentials.POSTGRES_PORT);

    if (isNaN(port)) {
      throw new Error(`Invalid port number: ${credentials.POSTGRES_PORT}`);
    }

    const kysely_neon_dialect_config: NeonDialectConfig = {
      connectionString: credentials.POSTGRES_URL satisfies string,
      host: credentials.POSTGRES_HOST satisfies string,
      user: credentials.POSTGRES_USER satisfies string,
      password: credentials.POSTGRES_PASSWORD satisfies string,
      database: credentials.POSTGRES_DATABASE satisfies string,
      useSecureWebSocket: (this.env === "production") satisfies boolean,
      port,
      wsProxy: (pg_host: string): string => {
        if (debug) {
          console.log(
            `[SchemaVaultsPostgresNeonProxyAdapter] NeonDialectConfig.wsProxy("${pg_host}")`,
          );
        }
        // Calculate the wsProxy url from host
        return SchemaVaultsPostgresNeonProxyAdapter.getPostgresNeonWsProxyUrl({
          pg_host,
          environment,
          debug,
        }) satisfies string;
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
