import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresNeonProxyAdapter from "@/schemavaults-postgres-neon-proxy-adapter";
import { sql } from "@/sql";

interface IPerson {
  id: number;
  name: string;
}

type TestDatabaseType = {
  people: IPerson;
};

describe("ConnectToLocalDatabase", () => {
  test("should connect to local database", async () => {
    const adapter = new SchemaVaultsPostgresNeonProxyAdapter<TestDatabaseType>({
      environment: "test",
      credentials: {
        POSTGRES_DATABASE: "main",
        POSTGRES_HOST: "postgres",
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: "postgres",
      },
    });
    expect(adapter).toBeTruthy();

    async function createTable(
      dbh: SchemaVaultsPostgresNeonProxyAdapter<TestDatabaseType>,
    ): Promise<void> {
      await sql`CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );`.execute(dbh.db);
    }

    await createTable(adapter);

    const rows: readonly IPerson[] = await adapter.db
      .selectFrom("people")
      .selectAll()
      .execute();

    expect(rows).toBeArrayOfSize(0);

    await adapter.db
      .insertInto("people")
      .values({ name: "John Doe", id: 0 })
      .executeTakeFirstOrThrow();

    const rows_after_insert: readonly IPerson[] = await adapter.db
      .selectFrom("people")
      .selectAll()
      .execute();

    expect(rows_after_insert).toBeArrayOfSize(1);

    await adapter.db.destroy();
  });
});
