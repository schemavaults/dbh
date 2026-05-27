import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresNeonProxyAdapter from "@/adapters/schemavaults-postgres-neon-proxy-adapter";

describe("SchemaVaultsPostgresNeonProxyAdapter", () => {
  test("should export the SchemaVaultsPostgresNeonProxyAdapter", () => {
    expect(SchemaVaultsPostgresNeonProxyAdapter).toBeDefined();
  });

  test("should initialize a SchemaVaultsPostgresNeonProxyAdapter instance without an error", () => {
    const dbh = new SchemaVaultsPostgresNeonProxyAdapter({
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

    void dbh;
  });
});
