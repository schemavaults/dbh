import type {
  BaseInitializablePostgresDatabaseCredentials,
  PostgresDatabaseCredentials,
} from "@/types/PostgresDatabaseCredentials";
import { IDatabaseHandler } from "@/types/IDatabaseHandler";
import {
  isValidAppEnvironment,
  type SchemaVaultsAppEnvironment,
} from "@/types/SchemaVaultsAppEnvironment";
import isDbhInDebugMode from "@/utils/isDbhInDebugMode";
import parseDatabaseCredentials from "@/utils/parseDatabaseCredentials";
import parseDatabaseCredentialsFromEnv from "@/utils/parseDatabaseCredentialsFromEnv";
import type { Dialect } from "kysely";
import { Kysely, type KyselyConfig } from "kysely";

export interface IAbstractSchemaVaultsDbhAdapterConstructorOpts {
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
}

export default abstract class AbstractSchemaVaultsDbhAdapter<
  KyselyTablesType extends object,
  TConstructorOpts extends IAbstractSchemaVaultsDbhAdapterConstructorOpts =
    IAbstractSchemaVaultsDbhAdapterConstructorOpts,
> implements IDatabaseHandler<KyselyTablesType> {
  protected readonly credentials: PostgresDatabaseCredentials;
  protected readonly kysely_db: Kysely<KyselyTablesType>;
  protected readonly env: SchemaVaultsAppEnvironment;
  protected readonly debug: boolean;

  public constructor(opts: TConstructorOpts) {
    // parse SCHEMAVAULTS_APP_ENVIRONMENT
    if (!isValidAppEnvironment(opts.environment)) {
      throw new TypeError("Invalid SCHEMAVAULTS_APP_ENVIRONMENT!");
    }
    this.env = opts.environment satisfies SchemaVaultsAppEnvironment;

    // checks if 'SCHEMAVAULTS_DBH_DEBUG="true"' is set in env vars, or defaults to yes if in dev/test/staging environment
    this.debug = isDbhInDebugMode(this.env);

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
    this.credentials = credentials;

    const dialect: Dialect = this.initializeDbDialect(opts);

    const kysely_configuration: KyselyConfig = {
      dialect,
      log: ["query", "error"],
    };

    this.kysely_db = new Kysely<KyselyTablesType>(kysely_configuration);
  }

  protected abstract initializeDbDialect(
    opts: Omit<TConstructorOpts, "credentials" | "environment">,
  ): Dialect;

  public get db(): Kysely<KyselyTablesType> {
    return this.kysely_db;
  }

  public async destroy(): Promise<void> {
    return await this.kysely_db.destroy();
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    return await this.destroy();
  }
}
