import type { PostgresDatabaseCredentials } from "@/PostgresDatabaseCredentials";
import maybeStripQuotes from "./maybeStripQuotes";
import parseDatabaseCredentials from "./parseDatabaseCredentials";

export function parseDatabaseCredentialsFromEnv(
  env: NodeJS.ProcessEnv,
  debug: boolean = false,
): PostgresDatabaseCredentials {
  return parseDatabaseCredentials(process.env, debug);
}

export default parseDatabaseCredentialsFromEnv;
