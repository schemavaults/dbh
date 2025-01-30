import type { ConnectedDBHResourcesType } from "./connected_resources_type";

export interface AsyncDatabaseConnectionResource {
  connected_server_resources: ConnectedDBHResourcesType;
  [Symbol.asyncDispose]: () => Promise<void>;
}
