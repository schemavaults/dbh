export type SchemaVaultsAppEnvironment = 'development' | 'test' | 'staging' | 'production';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SCHEMAVAULTS_APP_ENVIRONMENT?: SchemaVaultsAppEnvironment;
    }
  }
}

export function isValidAppEnvironment(env: unknown): env is SchemaVaultsAppEnvironment {
  if (typeof env !== "string") {
    return false;
  }
  if (env === "development" || env === "test" || env === "staging" || env === "production") {
    return true
  }
  return false;
}