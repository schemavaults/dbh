import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresNeonProxyAdapter from "@/schemavaults-postgres-neon-proxy-adapter";
import { sql } from "@/sql";
import { migrate, reverse } from "@/migrate";
import path from "path";

class DBH
  extends SchemaVaultsPostgresNeonProxyAdapter<any>
  implements AsyncDisposable
{
  public constructor() {
    super({
      credentials: {
        POSTGRES_DATABASE: "main",
        POSTGRES_HOST: "postgres",
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: "postgres",
      },
      environment: "test",
      wsProxyUrl: () => `postgres-ws-proxy:5433/v1`,
    });
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    return await this.destroy();
  }
}

const migrationFolder = path.resolve(__dirname, "../example-migrations");

async function doesTableExist(db: any, table_name: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table_name}
    ) AS exists;
  `.execute(db);

  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  const row = rows[0];
  return row &&
    typeof row === "object" &&
    "exists" in row &&
    row.exists === true
    ? true
    : false;
}

describe("MigrateUpAndDown", () => {
  test("should run migrations up then reverse them", async () => {
    await using adapter = new DBH();

    // Run all migrations up
    const upResults = await migrate({
      db: adapter.db,
      migrationFolder,
    });
    expect(upResults.length).toBeGreaterThan(0);
    for (const result of upResults) {
      expect(result.status).toBe("Success");
      expect(result.direction).toBe("Up");
    }

    // Verify the squirrels table exists
    expect(await doesTableExist(adapter.db, "example_squirrels")).toBeTrue();

    // Reverse to template migration (undoes 00001)
    const downResults = await reverse({
      db: adapter.db,
      migrationFolder,
      version: "00000-template-migration",
    });
    expect(downResults.length).toBeGreaterThan(0);
    for (const result of downResults) {
      expect(result.status).toBe("Success");
      expect(result.direction).toBe("Down");
    }

    // Verify the squirrels table no longer exists
    expect(await doesTableExist(adapter.db, "example_squirrels")).toBeFalse();
  });
});
