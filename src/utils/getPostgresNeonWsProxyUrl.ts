import type { SchemaVaultsAppEnvironment } from "@schemavaults/app-definitions";

export function getPostgresNeonWsProxyUrl(
  pg_host: string,
  environment: SchemaVaultsAppEnvironment,
): string {
  if (environment !== "production") {
    console.log(
      `[getPostgresNeonWsProxyUrl] Loading websocket proxy URL in environment "${environment}"`,
    );
  }

  let ws_host: string;
  if (environment === "development") {
    if (pg_host.includes("localhost")) {
      ws_host = "localhost";
    } else {
      ws_host = "schemavaults-postgres-proxy-dev";
    }
  } else if (environment === "test" || environment === "staging") {
    ws_host = "schemavaults-postgres-proxy-dev";
  } else {
    ws_host = pg_host;
  }

  const neon_api_version_suffix = "v1" as const satisfies string;

  const postgresNeonWsProxyUrl =
    `${ws_host}:5433/${neon_api_version_suffix}` as const satisfies string;

  if (environment !== "production") {
    console.log(
      `[getPostgresNeonWsProxyUrl] Loaded websocket proxy URL: `,
      postgresNeonWsProxyUrl,
    );
  }

  return postgresNeonWsProxyUrl;
}

export default getPostgresNeonWsProxyUrl;
