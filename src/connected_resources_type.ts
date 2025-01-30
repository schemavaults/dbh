import type { SchemaVaultsSerializationDeserializationModule } from "@schemavaults/serde";
import type { MongoClient } from "mongodb";

// These should be treated as connected
export interface ConnectedDBHResourcesType {
  mongo: MongoClient;
  serde?: SchemaVaultsSerializationDeserializationModule;
}
