import { MongoClient } from "mongodb";
import { getMongoConnectionString } from "./connection_string";
import type { AsyncDatabaseConnectionResource } from "./async_database_connection_resource";
import type { SchemaVaultsSerializationDeserializationModule } from "@schemavaults/serde";

export interface InitDBHOptions {
  serde?: SchemaVaultsSerializationDeserializationModule;
}

export class DBH {
  private _mongo_client: MongoClient;
  private serde: SchemaVaultsSerializationDeserializationModule | undefined;
  private _debug: boolean = process.env.NODE_ENV === 'development';

  private connected: boolean = false;

  public constructor(opts?: InitDBHOptions) {
    const uri: string = getMongoConnectionString();
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`[DBH] Creating MongoDB client...`);
    }
    try {
      this._mongo_client = new MongoClient(uri);
    } catch (error: unknown) {
      console.error("[DBH] Failed to create MongoDB client", error);
      process.exit(1);
    }
    this.serde = opts?.serde ?? undefined;
  }

  private async connect(): Promise<void> {
    if (this._debug) {
      console.log(
        "[DBH::connect()] Connecting server resources... "
      );
    }

    try {
      this._mongo_client = await this._mongo_client.connect();
      this.connected = true;

      if (this._debug) {
        console.log(
          "[DBH::connect()] Connected server resources."
        );
      }
      return;
    } catch (e: unknown) {
      this.connected = false;
      console.error(`[DBH] Failed to connect: `, e);
      if (this._debug) {
        console.error(`[DBH] MONGODB_HOST: `, process.env.MONGODB_HOST);
        console.error(`[DBH] MONGODB_USERNAME: `, process.env.MONGODB_USERNAME);
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.error(`[DBH] MONGODB_PASSWORD: `, process.env.MONGODB_PASSWORD);
        }
        console.error(`[DBH] MONGODB_DB_NAME: `, process.env.MONGODB_DB_NAME);
      }

      throw new Error("[DBH] Failed to connect!")
    }
  }

  public async close(): Promise<void> {
    if (this._debug) {
      console.log(
        "[DBH::close()] Closing server resources... "
      );
    }

    try {
      await this._mongo_client.close();
      this.connected = false;
    } catch (e: unknown) {
      console.error("Failed to close database connection: ", e);
    }
  }

  // await using dbh = await (new DBH()).db()
  public async db(): Promise<AsyncDatabaseConnectionResource> {
    if (this._debug) {
      console.log(
        "[DBH::db()] Loading server resources... " +
        "(be sure to use this with 'await using' to auto disconnect)"
      );
    }

    await this.connect();
    return {
      connected_server_resources: {
        mongo: this._mongo_client satisfies MongoClient,
        serde: this.serde ?? undefined
      },
      [Symbol.asyncDispose]: async (): Promise<void> => {
        if (this._debug) {
          console.log(
            "[DBH::db()] [Symbol.asyncDispose]() running... "
          );
        }
        try {
          await this.close();
        } catch (e: unknown) {
          console.error("Failed to close database connection handler: ", e);
          throw new Error("Failed to close database connection handler!");
        }
      }
    }
  }
}
