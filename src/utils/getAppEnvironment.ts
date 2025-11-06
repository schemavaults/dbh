import { isValidAppEnvironment, type SchemaVaultsAppEnvironment } from "@/SchemaVaultsAppEnvironment";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SCHEMAVAULTS_APP_ENVIRONMENT?: SchemaVaultsAppEnvironment;
    }
  }
}

export function getAppEnvironment(): SchemaVaultsAppEnvironment {
  const env = process.env["SCHEMAVAULTS_APP_ENVIRONMENT"];
  if (isValidAppEnvironment(env)) {
    return env;
  }
  return "production"; // default to production if not set or invalid
}

export default getAppEnvironment;