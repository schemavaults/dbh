import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresNeonProxyAdapter from "@/schemavaults-postgres-neon-proxy-adapter";
import { sql } from "@/sql";

// Example Table Type
interface IPerson {
  id: number;
  name: string;
}

// Example Database Type using example table
type TestDatabaseType = {
  people: IPerson;
};

class DBH
  extends SchemaVaultsPostgresNeonProxyAdapter<TestDatabaseType>
  implements AsyncDisposable
{
  public constructor() {
    super({
      credentials: {
        // dummy credentials for test environment-- leave this object undefined to get from env
        POSTGRES_DATABASE: "main",
        POSTGRES_HOST: "postgres",
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: "postgres",
      },
      environment: "test",

      // for this e2e test, we can hardcode the proxy url
      // in reality, you may wish to customize this based on your environment
      wsProxyUrl: ({ pg_host, environment, debug }) => {
        void pg_host;
        void environment;
        void debug;
        return `postgres-ws-proxy:5433/v1`;
      },
    });
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    return await this.destroy();
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ConnectToLocalDatabase", () => {
  test("should connect to local database", async () => {
    await using adapter = new DBH();
    expect(adapter).toBeTruthy();

    async function doesTableExist(
      dbh: SchemaVaultsPostgresNeonProxyAdapter<TestDatabaseType>,
      table_name: string,
    ): Promise<boolean> {
      const { rows } = await sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ${table_name}
        ) AS exists;
      `.execute(dbh.db);

      if (!Array.isArray(rows)) {
        throw new Error("Unexpected result from database, 'rows' not an array");
      }

      if (rows.length === 0) {
        return false;
      } else if (rows.length > 1) {
        throw new Error(
          "Unexpected result from database, 'rows' has more than one element",
        );
      } else if (!rows[0] || typeof rows[0] !== "object") {
        throw new Error("Unexpected result from database, 'rows' is empty");
      }

      const tableExists: object = rows[0];

      if (tableExists && "exists" in tableExists && tableExists.exists) {
        return true;
      }

      return false;
    }

    async function createTable(
      dbh: SchemaVaultsPostgresNeonProxyAdapter<TestDatabaseType>,
    ): Promise<void> {
      await sql`CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );`.execute(dbh.db);
    }

    async function listPeople(): Promise<readonly IPerson[]> {
      return await adapter.db.selectFrom("people").selectAll().execute();
    }

    // test doesTableExist functionality
    expect(
      await doesTableExist(adapter, `random-table-${crypto.randomUUID()}`),
    ).toBeFalse();

    const tableExistsBefore: boolean = await doesTableExist(adapter, "people");
    if (!tableExistsBefore) {
      await createTable(adapter);
      await sleep(250);
    }

    const tableExistsAfter = await doesTableExist(adapter, "people");
    expect(tableExistsAfter, "Table should exist after creation").toBeTrue();

    expect(await listPeople()).toBeArrayOfSize(0);

    await adapter.db
      .insertInto("people")
      .values({ name: "John Doe", id: 0 })
      .executeTakeFirstOrThrow();

    expect(await listPeople()).toBeArrayOfSize(1);

    await adapter.db
      .insertInto("people")
      .values({ name: "Alex Whitman", id: 1 })
      .executeTakeFirstOrThrow();

    expect(await listPeople()).toBeArrayOfSize(2);

    await adapter.db
      .insertInto("people")
      .values({ name: "Bob Smith", id: 2 })
      .executeTakeFirstOrThrow();

    const people: readonly IPerson[] = await listPeople();
    expect(people).toBeArrayOfSize(3);
    const names: Set<string> = new Set(people.map((person) => person.name));
    expect(names.size).toBe(3);
    for (const name of ["John Doe", "Alex Whitman", "Bob Smith"]) {
      expect(names.has(name), `Expected ${name} to be in the set`).toBe(true);
    }
  });
});
