import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresAdapter from "@/adapters/schemavaults-postgres-adapter";
import createDbh from "@/create-dbh";

describe("SchemaVaultsPostgresAdapter", () => {
  test("should export the SchemaVaultsPostgresAdapter", () => {
    expect(SchemaVaultsPostgresAdapter).toBeDefined();
  });

  test("should initialize a SchemaVaultsPostgresAdapter instance without an error", () => {
    const dbh = new SchemaVaultsPostgresAdapter({
      environment: "test",
      credentials: {
        POSTGRES_DATABASE: "test_db",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "test_password",
        POSTGRES_PORT: 5432,
        POSTGRES_URL:
          "postgresql://test_user:test_password@localhost:5432/test_db",
        POSTGRES_USER: "test_user",
      },
    });
    expect(dbh).toBeInstanceOf(SchemaVaultsPostgresAdapter);
  });

  test("should initialize a SchemaVaultsPostgresAdapter instance via createDbh without an error", async () => {
    await using dbh = await createDbh("postgres", {
      environment: "test",
      credentials: {
        POSTGRES_DATABASE: "test_db",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "test_password",
        POSTGRES_PORT: 5432,
        POSTGRES_URL:
          "postgresql://test_user:test_password@localhost:5432/test_db",
        POSTGRES_USER: "test_user",
      },
    });
    expect(dbh).toBeInstanceOf(SchemaVaultsPostgresAdapter);
  });
});
