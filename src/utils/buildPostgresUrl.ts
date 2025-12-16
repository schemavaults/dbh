import type { BaseInitializablePostgresDatabaseCredentials } from "@/PostgresDatabaseCredentials";

function buildPostgresUrl(
  opts: Pick<
    BaseInitializablePostgresDatabaseCredentials,
    | "POSTGRES_HOST"
    | "POSTGRES_PORT"
    | "POSTGRES_USER"
    | "POSTGRES_PASSWORD"
    | "POSTGRES_DATABASE"
  >,
): string {
  return `postgresql://${opts.POSTGRES_USER}:${opts.POSTGRES_PASSWORD}@${opts.POSTGRES_HOST}:${opts.POSTGRES_PORT}/${opts.POSTGRES_DATABASE}`;
}

export default buildPostgresUrl;
