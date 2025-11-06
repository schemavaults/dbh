
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POSTGRES_USER: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_URL: string;
      POSTGRES_URL_NON_POOLING?: string | undefined;
      POSTGRES_HOST: string;
      POSTGRES_PORT: string;
      POSTGRES_DATABASE: string;
    }
  }
}

export interface PostgresDatabaseCredentials {
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_URL: string;
  POSTGRES_URL_NON_POOLING?: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DATABASE: string;
}