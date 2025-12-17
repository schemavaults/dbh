import type {
  BaseInitializablePostgresDatabaseCredentials,
  PostgresDatabaseCredentials,
} from "@/PostgresDatabaseCredentials";
import maybeStripQuotes from "@/utils/maybeStripQuotes";
import buildPostgresUrl from "./buildPostgresUrl";

function parseDatabaseCredentials(
  minimum_credentials:
    | Record<string, boolean | string | number | undefined>
    | BaseInitializablePostgresDatabaseCredentials,
  debug: boolean = false,
): PostgresDatabaseCredentials {
  if (typeof minimum_credentials !== "object") {
    throw new Error(
      "Did not receive an object to parse database credentials from!",
    );
  }

  if (
    // ensure there are no strange types in the (probably process.env) object
    Object.values(minimum_credentials).some(
      (value) =>
        typeof value !== "string" &&
        typeof value !== "undefined" &&
        typeof value !== "number" &&
        typeof value !== "boolean",
    )
  ) {
    const invalidTypes: Set<string> = new Set(
      Object.values(minimum_credentials).map((value) => typeof value),
    );
    invalidTypes.delete("undefined");
    invalidTypes.delete("string");
    invalidTypes.delete("number");
    invalidTypes.delete("boolean");
    throw new TypeError(
      "Received invalid database credentials; " +
        "expected only strings or undefined in values object provided to parse credentials from. " +
        `Received invalid types: ${Array.from(invalidTypes).join(", ")}`,
    );
  }

  const POSTGRES_URL_NON_POOLING = maybeStripQuotes(
    typeof minimum_credentials.POSTGRES_URL_NON_POOLING === "string"
      ? minimum_credentials.POSTGRES_URL_NON_POOLING
      : undefined,
  );
  if (!POSTGRES_URL_NON_POOLING) {
    if (debug) {
      console.warn(
        "POSTGRES_URL_NON_POOLING is not set in environment variables!",
      );
    }
  } else {
    if (debug) {
      console.log(
        `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres no-pooling connection url POSTGRES_URL_NON_POOLING: "${POSTGRES_URL_NON_POOLING}"`,
      );
    }
  }

  const POSTGRES_HOST = maybeStripQuotes(
    typeof minimum_credentials.POSTGRES_HOST === "string"
      ? minimum_credentials.POSTGRES_HOST
      : undefined,
  );
  if (!POSTGRES_HOST) {
    throw new Error("POSTGRES_HOST is not set in environment variables!");
  } else {
    if (debug) {
      console.log(
        `[SchemaVaultsPostgresNeonProxyAdapter] Using database POSTGRES_HOST: "${POSTGRES_HOST}"`,
      );
    }
  }

  let POSTGRES_PORT: number = 5432;
  if (
    typeof minimum_credentials.POSTGRES_PORT === "string" &&
    minimum_credentials.POSTGRES_PORT.length > 0
  ) {
    POSTGRES_PORT = Number.parseInt(
      maybeStripQuotes(minimum_credentials.POSTGRES_PORT) ?? "NaN",
    );
  }
  if (typeof POSTGRES_PORT !== "number" || isNaN(POSTGRES_PORT)) {
    throw new Error(
      "Failed to load POSTGRES_PORT from environment variables! NaN error!",
    );
  }

  const POSTGRES_DATABASE = maybeStripQuotes(
    typeof minimum_credentials.POSTGRES_DATABASE === "string"
      ? minimum_credentials.POSTGRES_DATABASE
      : undefined,
  );
  if (!POSTGRES_DATABASE) {
    throw new Error(
      "Failed to load database name from POSTGRES_DATABASE environment variable!",
    );
  }

  const POSTGRES_USER = maybeStripQuotes(
    typeof minimum_credentials.POSTGRES_USER === "string"
      ? minimum_credentials.POSTGRES_USER
      : undefined,
  );
  if (!POSTGRES_USER) {
    throw new Error("POSTGRES_USER is not defined in environment variables!");
  }

  const POSTGRES_PASSWORD = maybeStripQuotes(
    typeof minimum_credentials.POSTGRES_PASSWORD === "string"
      ? minimum_credentials.POSTGRES_PASSWORD
      : undefined,
  );
  if (!POSTGRES_PASSWORD) {
    throw new Error(
      "POSTGRES_PASSWORD is not defined in environment variables!",
    );
  }

  let POSTGRES_URL: string = "";
  if (
    typeof minimum_credentials.POSTGRES_URL === "string" &&
    minimum_credentials.POSTGRES_URL.length > 0
  ) {
    POSTGRES_URL = maybeStripQuotes(minimum_credentials.POSTGRES_URL) ?? "";
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
      `[SchemaVaultsPostgresNeonProxyAdapter] Using postgres connection url POSTGRES_URL: "${POSTGRES_URL}"`,
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

export default parseDatabaseCredentials;
