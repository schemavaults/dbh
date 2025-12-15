import { PostgresDatabaseCredentials } from "@/PostgresDatabaseCredentials";
import maybeStripQuotes from "./maybeStripQuotes";

function buildPostgresUrl(
  opts: Pick<
    PostgresDatabaseCredentials,
    | "POSTGRES_HOST"
    | "POSTGRES_PORT"
    | "POSTGRES_USER"
    | "POSTGRES_PASSWORD"
    | "POSTGRES_DATABASE"
  >,
): string {
  return `postgresql://${opts.POSTGRES_USER}:${opts.POSTGRES_PASSWORD}@${opts.POSTGRES_HOST}:${opts.POSTGRES_PORT}/${opts.POSTGRES_DATABASE}`;
}

export function parseDatabaseCredentialsFromEnv(
  env: NodeJS.ProcessEnv,
  debug: boolean = false,
): PostgresDatabaseCredentials {
  const POSTGRES_URL_NON_POOLING = maybeStripQuotes(
    env.POSTGRES_URL_NON_POOLING,
  );
  if (!POSTGRES_URL_NON_POOLING) {
    console.warn(
      "POSTGRES_URL_NON_POOLING is not set in environment variables!",
    );
  } else {
    if (debug) {
      console.log(
        `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres no-pooling connection url POSTGRES_URL_NON_POOLING: \"${POSTGRES_URL_NON_POOLING}\"`,
      );
    }
  }

  const POSTGRES_HOST = maybeStripQuotes(env.POSTGRES_HOST);
  if (!POSTGRES_HOST) {
    throw new Error("POSTGRES_HOST is not set in environment variables!");
  } else {
    if (debug) {
      console.log(
        `[SchemaVaultsPostgresNeonProxyAdapter] Using database POSTGRES_HOST: \"${POSTGRES_HOST}\"`,
      );
    }
  }

  let POSTGRES_PORT: number = 5432;
  if (typeof env.POSTGRES_PORT === "string" && env.POSTGRES_PORT.length > 0) {
    POSTGRES_PORT = Number.parseInt(
      maybeStripQuotes(env.POSTGRES_PORT) ?? "NaN",
    );
  }
  if (typeof POSTGRES_PORT !== "number" || isNaN(POSTGRES_PORT)) {
    throw new Error(
      "Failed to load POSTGRES_PORT from environment variables! NaN error!",
    );
  }

  const POSTGRES_DATABASE = maybeStripQuotes(env.POSTGRES_DATABASE);
  if (!POSTGRES_DATABASE) {
    throw new Error(
      "Failed to load database name from POSTGRES_DATABASE environment variable!",
    );
  }

  const POSTGRES_USER = maybeStripQuotes(env.POSTGRES_USER);
  if (!POSTGRES_USER) {
    throw new Error("POSTGRES_USER is not defined in environment variables!");
  }

  const POSTGRES_PASSWORD = maybeStripQuotes(env.POSTGRES_PASSWORD);
  if (!POSTGRES_PASSWORD) {
    throw new Error(
      "POSTGRES_PASSWORD is not defined in environment variables!",
    );
  }

  let POSTGRES_URL: string = "";
  if (typeof env.POSTGRES_URL === "string" && env.POSTGRES_URL.length > 0) {
    POSTGRES_URL = maybeStripQuotes(env.POSTGRES_URL) ?? "";
  } else {
    POSTGRES_URL = buildPostgresUrl({
      POSTGRES_DATABASE,
      POSTGRES_HOST,
      POSTGRES_PORT,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
    });
  }
  if (!POSTGRES_URL) {
    throw new Error(
      "Failed to load POSTGRES_URL from environment variables, or to construct it from other environment variables!",
    );
  }

  if (debug) {
    console.log(
      `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres connection url POSTGRES_URL: \"${POSTGRES_URL}\"`,
    );
  }

  return {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_URL,
    POSTGRES_URL_NON_POOLING,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DATABASE,
  };
}

export default parseDatabaseCredentialsFromEnv;
