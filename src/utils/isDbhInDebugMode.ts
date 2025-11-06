import type { SchemaVaultsAppEnvironment } from "@/SchemaVaultsAppEnvironment";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SCHEMAVAULTS_DBH_DEBUG?: 'true' | 'false';
    }
  }
}

export function isDbhInDebugMode(
  environment: SchemaVaultsAppEnvironment,
): boolean {
  const SCHEMAVAULTS_DBH_DEBUG_ENV_VAR: string | undefined =
    process.env["SCHEMAVAULTS_DBH_DEBUG"];

  if (typeof SCHEMAVAULTS_DBH_DEBUG_ENV_VAR === "string") {
    if (SCHEMAVAULTS_DBH_DEBUG_ENV_VAR.toLowerCase().includes("true")) {
      return true;
    } else {
      return false;
    }
  } else {
    // 'SCHEMAVAULTS_DBH_DEBUG' is not set in environment variables, get default debug state based on current environment
    if (environment !== "production") {
      return true;
    } else {
      return false;
    }
  }
}

export default isDbhInDebugMode;
