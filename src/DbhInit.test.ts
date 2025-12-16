import { describe, expect, test } from "bun:test";
import SchemaVaultsPostgresNeonProxyAdapter from "@/schemavaults-postgres-neon-proxy-adapter";

describe("DBH Init", () => {
  test("should export the SchemaVaultsPostgresNeonProxyAdapter", () => {
    expect(SchemaVaultsPostgresNeonProxyAdapter).toBeDefined();
  });

  test("should initialize a dbh instance without an error", () => {
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
