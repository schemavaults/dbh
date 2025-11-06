export type SchemaVaultsAppEnvironment = 'development' | 'test' | 'staging' | 'production';

export function isValidAppEnvironment(env: unknown): env is SchemaVaultsAppEnvironment {
  if (typeof env !== "string") {
    return false;
  }
  if (env === "development" || env === "test" || env === "staging" || env === "production") {
    return true
  }
  return false;
}