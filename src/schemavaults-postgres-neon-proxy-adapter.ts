// This file sets up kysely to connect to postgress

import { NeonDialect } from "kysely-neon";
import { Kysely } from "kysely";
import type { SchemaVaultsAppEnvironment } from "@schemavaults/app-definitions";
import type { KyselyConfig } from "kysely";
import maybeStripQuotes from "@/utils/maybeStripQuotes";
import getPostgresNeonWsProxyUrl from "./utils/getPostgresNeonWsProxyUrl";

type NeonDialectConfig = ConstructorParameters<typeof NeonDialect>[0];

export interface ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts {
  environment: SchemaVaultsAppEnvironment;
}

export class SchemaVaultsPostgresNeonProxyAdapter<
  KyselyTablesType extends object,
> {
  private kysely_db: Kysely<KyselyTablesType>;
  private env: SchemaVaultsAppEnvironment;

  private static maybeStripQuotes(
    maybeQuotes?: string | undefined,
  ): string | undefined {
    return maybeStripQuotes(maybeQuotes);
  }

  private static getPostgresNeonWsProxyUrl(
    pg_host: string,
    environment: SchemaVaultsAppEnvironment,
  ): string {
    return getPostgresNeonWsProxyUrl(pg_host, environment) satisfies string;
  } // end of getPostgresNeonWsProxyUrl()

  // Initialized from getInstance() (Singleton pattern)
  public constructor(
    opts: ISchemaVaultsPostgresNeonProxyAdapterConstructorOpts,
  ) {
    const environment: SchemaVaultsAppEnvironment = opts.environment;
    this.env = environment;

    const POSTGRES_URL = SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
      process.env.POSTGRES_URL,
    );
    const POSTGRES_HOST = SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
      process.env.POSTGRES_HOST,
    );

    if (!POSTGRES_URL) {
      throw new Error("POSTGRES_URL is not set");
    } else {
      if (this.env !== "production") {
        console.log(
          `[SchemaVaultsPostgresNeonProxyAdapter] Using database POSTGRES_URL: \"${POSTGRES_URL}\"`,
        );
      }
    }

    if (!POSTGRES_HOST) {
      throw new Error("POSTGRES_HOST is not set");
    } else {
      if (this.env !== "production") {
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

    if (this.env !== "production") {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initializing SchemaVaults x Kysely auth database adapter...",
      );
    }

    const kysely_neon_dialect_config: NeonDialectConfig = {
      connectionString: POSTGRES_URL,
      host: POSTGRES_HOST,
      password: SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_PASSWORD,
      ),
      database: POSTGRES_DATABASE,
      user: SchemaVaultsPostgresNeonProxyAdapter.maybeStripQuotes(
        process.env.POSTGRES_USER,
      ),
      useSecureWebSocket: (this.env === "production") satisfies boolean,
      port: POSTGRES_PORT,
      wsProxy: (pg_host: string): string => {
        // Calculate the wsProxy url from host
        return SchemaVaultsPostgresNeonProxyAdapter.getPostgresNeonWsProxyUrl(
          pg_host,
          environment,
        );
      },
    };

    if (this.env !== "production") {
      kysely_neon_dialect_config.pipelineTLS = false;
      kysely_neon_dialect_config.pipelineConnect = false;
    }

    if (
      this.env === "development" ||
      this.env === "test" ||
      this.env === "staging"
    ) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Kysely Neon DB adapter configuration: ",
        kysely_neon_dialect_config,
      );
    }

    const dialect = new NeonDialect(kysely_neon_dialect_config);

    const kysely_configuration: KyselyConfig = {
      dialect,
      log: ["query", "error"],
    };

    this.kysely_db = new Kysely<KyselyTablesType>(kysely_configuration);

    if (
      this.env === "development" ||
      this.env === "test" ||
      this.env === "staging"
    ) {
      console.log(
        "[SchemaVaultsPostgresNeonProxyAdapter] Initialized SchemaVaults x Kysely auth database adapter in environment: ",
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
