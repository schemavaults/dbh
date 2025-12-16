import {
  isValidAppEnvironment,
  type SchemaVaultsAppEnvironment,
} from "@/SchemaVaultsAppEnvironment";

export interface IGetPostgresNeonWsProxyUrlOpts {
  pg_host: string;
  environment: SchemaVaultsAppEnvironment;
  debug?: boolean;
}

export function getPostgresNeonWsProxyUrl({
  pg_host,
  environment,
  ...opts
}: IGetPostgresNeonWsProxyUrlOpts): string {
  const debug: boolean = opts.debug ?? false;
  if (debug) {
    console.log(
      `[getPostgresNeonWsProxyUrl] Loading websocket proxy URL in environment "${environment}" from base 'pg_host' url:`,
      pg_host,
    );
  }

  let ws_host: string;
  if (environment === "production") {
    ws_host = pg_host;
  } else if (environment === "development") {
    if (pg_host.includes("localhost")) {
      ws_host = "localhost";
    } else {
      ws_host = "postgres-ws-proxy";
    }
  } else if (environment === "test" || environment === "staging") {
    ws_host = "postgres-ws-proxy";
  } else {
    throw new Error("Failed to build 'ws_host' url for Postgres Neon proxy!");
  }

  console.assert(
    isValidAppEnvironment(environment),
    "Invalid app environment to determine postgres neon websocket proxy URL for!",
  );

  const neon_api_version_suffix =
    environment === "production"
      ? ("v2" as const satisfies string)
      : ("v1" as const satisfies string);

  const usingLocalNeonProxyContainer: boolean = environment !== "production";
  const shouldAppendPort: boolean = usingLocalNeonProxyContainer;

  const postgresNeonWsProxyUrl =
    `${ws_host}${shouldAppendPort ? ":5433" : ""}/${neon_api_version_suffix}` as const satisfies string;

  console.assert(
    !postgresNeonWsProxyUrl.startsWith("ws://") &&
      !postgresNeonWsProxyUrl.startsWith("wss://"),
    "Expected built postgres neon proxy websocket URL to not include protocol (ws:// or wss://)!",
  );

  if (debug) {
    console.log(
      `[getPostgresNeonWsProxyUrl] Loaded websocket proxy URL: `,
      postgresNeonWsProxyUrl,
    );
  }

  return postgresNeonWsProxyUrl;
}

export default getPostgresNeonWsProxyUrl;
