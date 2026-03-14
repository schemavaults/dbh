import { describe, expect, test } from "bun:test";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import SchemaVaultsPostgresNeonProxyAdapter from "@/schemavaults-postgres-neon-proxy-adapter";
import { sql } from "@/sql";

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

function runCli(args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", "src/cli.ts", ...args], {
      cwd: "/schemavaults/dbh",
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

describe("CliEnvFile", () => {
  test("should migrate and reverse using --env-file", async () => {
    const envFilePath = path.resolve("/tmp/.env.cli-test");

    try {
      // Write a temp env file with DB credentials
      fs.writeFileSync(
        envFilePath,
        [
          "POSTGRES_DATABASE=main",
          "POSTGRES_HOST=postgres",
          "POSTGRES_USER=postgres",
          "POSTGRES_PASSWORD=postgres",
        ].join("\n"),
      );

      // Run migrate via CLI with --env-file
      const migrateResult = await runCli([
        "migrate",
        migrationFolder,
        "-e",
        "test",
        "--ws-proxy-url",
        "postgres-ws-proxy:5433/v1",
        "--env-file",
        envFilePath,
      ]);
      console.log("migrate output:", migrateResult.output);
      expect(migrateResult.code).toBe(0);

      // Verify table exists
      await using adapter = new DBH();
      expect(
        await doesTableExist(adapter.db, "example_squirrels"),
      ).toBeTrue();

      // Run reverse via CLI with --env-file
      const reverseResult = await runCli([
        "reverse",
        migrationFolder,
        "00000-template-migration",
        "-e",
        "test",
        "--ws-proxy-url",
        "postgres-ws-proxy:5433/v1",
        "--env-file",
        envFilePath,
      ]);
      console.log("reverse output:", reverseResult.output);
      expect(reverseResult.code).toBe(0);

      // Verify table no longer exists
      await using adapter2 = new DBH();
      expect(
        await doesTableExist(adapter2.db, "example_squirrels"),
      ).toBeFalse();
    } finally {
      // Clean up temp env file
      if (fs.existsSync(envFilePath)) {
        fs.unlinkSync(envFilePath);
      }
    }
  });
});
