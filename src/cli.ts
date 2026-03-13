import { Command } from "commander";
import path from "path";
import { createRequire } from "module";
import { SchemaVaultsPostgresNeonProxyAdapter } from "@/schemavaults-postgres-neon-proxy-adapter";
import { migrate, reverse } from "@/migrate";
import type { SchemaVaultsAppEnvironment } from "@/SchemaVaultsAppEnvironment";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
if (typeof version !== "string") {
  throw new TypeError(
    "Failed to resolve 'version' from @schemavaults/dbh package.json file!",
  );
}

const dbhCli = new Command();

dbhCli
  .name("dbh")
  .description("@schemavaults/dbh CLI — database migration tools")
  .version(version);

dbhCli
  .command("migrate")
  .description(
    "Run database migrations forward (to latest or a specific version)",
  )
  .argument("<folder>", "Path to the migration folder")
  .argument("[version]", "Target migration version (defaults to latest)")
  .requiredOption(
    "-e, --environment <environment>",
    "App environment (development|test|staging|production)",
  )
  .option("--ws-proxy-url <url>", "Custom WebSocket proxy URL")
  .action(
    async (
      folder: string,
      version: string | undefined,
      opts: { environment: string; wsProxyUrl?: string },
    ) => {
      const resolvedFolder = path.resolve(folder);
      const adapter = new SchemaVaultsPostgresNeonProxyAdapter<any>({
        environment: opts.environment as SchemaVaultsAppEnvironment,
        wsProxyUrl: opts.wsProxyUrl,
      });

      try {
        const results = await migrate({
          db: adapter.db,
          migrationFolder: resolvedFolder,
          version,
        });

        for (const r of results) {
          console.log(`[${r.direction}] ${r.migrationName}: ${r.status}`);
        }

        if (results.length === 0) {
          console.log("No migrations to run.");
        }
      } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
      } finally {
        await adapter.destroy();
      }
    },
  );

dbhCli
  .command("reverse")
  .description("Roll back database migrations to a specific version")
  .argument("<folder>", "Path to the migration folder")
  .argument("<version>", "Target version to roll back to")
  .requiredOption(
    "-e, --environment <environment>",
    "App environment (development|test|staging|production)",
  )
  .option("--ws-proxy-url <url>", "Custom WebSocket proxy URL")
  .action(
    async (
      folder: string,
      version: string,
      opts: { environment: string; wsProxyUrl?: string },
    ) => {
      const resolvedFolder = path.resolve(folder);
      const adapter = new SchemaVaultsPostgresNeonProxyAdapter<any>({
        environment: opts.environment as SchemaVaultsAppEnvironment,
        wsProxyUrl: opts.wsProxyUrl,
      });

      try {
        const results = await reverse({
          db: adapter.db,
          migrationFolder: resolvedFolder,
          version,
        });

        for (const r of results) {
          console.log(`[${r.direction}] ${r.migrationName}: ${r.status}`);
        }

        if (results.length === 0) {
          console.log("No migrations to reverse.");
        }
      } catch (error) {
        console.error("Reverse migration failed:", error);
        process.exit(1);
      } finally {
        await adapter.destroy();
      }
    },
  );

export default dbhCli;

const isDirectRun =
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  dbhCli.parse();
}
