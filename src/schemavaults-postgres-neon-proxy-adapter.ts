// This file sets up kysely to connect to postgress

import { NeonDialect } from "kysely-neon";
import { Kysely } from "kysely";
import type { SchemaVaultsAppEnvironment } from "@schemavaults/app-definitions";
import type { KyselyConfig } from "kysely";
import maybeStripQuotes from "@/utils/maybeStripQuotes";
import getPostgresNeonWsProxyUrl, {
  type IGetPostgresNeonWsProxyUrlOpts,
} from "./utils/getPostgresNeonWsProxyUrl";
import isDbhInDebugMode from "@/utils/isDbhInDebugMode";

type NeonDialectConfig = ConstructorParameters<typeof NeonDialect>[0];

export interface ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts {
  environment: SchemaVaultsAppEnvironment;
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

    const POSTGRES_URL = SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
      process.env.POSTGRES_URL,
    );
    if (!POSTGRES_URL) {
      throw new Error("POSTGRES_URL is not set in environment variables!");
    } else {
      if (this.debug) {
        console.log(
          `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres connection url POSTGRES_URL: \"${POSTGRES_URL}\"`,
        );
      }
    }

    const POSTGRES_URL_NO_POOLING =
      SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_URL_NO_POOLING,
      );
    if (!POSTGRES_URL_NO_POOLING) {
      console.warn(
        "POSTGRES_URL_NO_POOLING is not set in environment variables!",
      );
    } else {
      if (this.debug) {
        console.log(
          `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres no-pooling connection url POSTGRES_URL_NO_POOLING: \"${POSTGRES_URL_NO_POOLING}\"`,
        );
      }
    }

    const POSTGRES_HOST = SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
      process.env.POSTGRES_HOST,
    );
    if (!POSTGRES_HOST) {
      throw new Error("POSTGRES_HOST is not set in environment variables!");
    } else {
      if (this.debug) {
        console.log(
          `[SchemaVaultsPostgresNeonProxyAdapter] Using database POSTGRES_HOST: \"${POSTGRES_HOST}\"`,
        );
      }
    }

    const POSTGRES_PORT: number = Number.parseInt(
      SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_PORT,
      ) ?? "NaN",
    );
    if (isNaN(POSTGRES_PORT)) {
      throw new Error(
        "Failed to load POSTGRES_PORT from environment variables! NaN error!",
      );
    }

    const POSTGRES_DATABASE =
      SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_DATABASE,
      );
    if (!POSTGRES_DATABASE) {
      throw new Error(
        "Failed to load database name from POSTGRES_DATABASE environment variable!",
      );
    }

    const POSTGRES_USER = SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
      process.env.POSTGRES_USER,
    );
    if (!POSTGRES_USER) {
      throw new Error("POSTGRES_USER is not defined in environment variables!");
    }

    const POSTGRES_PASSWORD =
      SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_PASSWORD,
      );
    if (!POSTGRES_PASSWORD) {
      throw new Error(
        "POSTGRES_PASSWORD is not defined in environment variables!",
      );
    }

    const kysely_neon_dialect_config: NeonDialectConfig = {
      connectionString: POSTGRES_URL satisfies string,
      host: POSTGRES_HOST satisfies string,
      user: POSTGRES_USER satisfies string,
      password: POSTGRES_PASSWORD satisfies string,
      database: POSTGRES_DATABASE satisfies string,
      useSecureWebSocket: (this.env === "production") satisfies boolean,
      port: POSTGRES_PORT satisfies number,
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
