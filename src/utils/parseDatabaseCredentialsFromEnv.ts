import type { PostgresDatabaseCredentials } from "@/PostgresDatabaseCredentials";
import parseDatabaseCredentials from "./parseDatabaseCredentials";

export function parseDatabaseCredentialsFromEnv(
  env: Record<string, string | undefined>,
  debug: boolean = false,
): PostgresDatabaseCredentials {
  return parseDatabaseCredentials(
    env satisfies Record<string, string | undefined>,
    debug,
  );
}

export default parseDatabaseCredentialsFromEnv;
