import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync, spawn } from "child_process";
import { SchemaVaultsPostgresNeonProxyAdapter } from "@/adapters/schemavaults-postgres-neon-proxy-adapter";
import { migrate, reverse } from "@/migrate";
import type { SchemaVaultsAppEnvironment } from "@/types/SchemaVaultsAppEnvironment";
import { loadEnvFile } from "@/utils/loadEnvFile";
import { validateMigrationDirectory } from "@/utils/validateMigrationDirectory";

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
  .option("--env-file <path>", "Path to env file to load (e.g. .env)")
  .action(
    async (
      folder: string,
      version: string | undefined,
      opts: { environment: string; wsProxyUrl?: string; envFile?: string },
    ) => {
      if (opts.envFile) {
        loadEnvFile(opts.envFile);
      }

      const resolvedFolder = path.resolve(folder);
      const adapter = new SchemaVaultsPostgresNeonProxyAdapter<object>({
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
  .option("--env-file <path>", "Path to env file to load (e.g. .env)")
  .action(
    async (
      folder: string,
      version: string,
      opts: { environment: string; wsProxyUrl?: string; envFile?: string },
    ) => {
      if (opts.envFile) {
        loadEnvFile(opts.envFile);
      }

      const resolvedFolder = path.resolve(folder);
      const adapter = new SchemaVaultsPostgresNeonProxyAdapter<object>({
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

dbhCli
  .command("build-db-migrations")
  .description(
    "Build TypeScript Kysely migration files into JavaScript using Bun's bundler",
  )
  .argument(
    "<migrations-src>",
    "Directory containing .ts migration source files",
  )
  .requiredOption(
    "--outdir <dir>",
    "Output directory for compiled migration .js files",
  )
  .requiredOption(
    "--sql-module <path>",
    "Path to sql.ts source module to build alongside",
  )
  .option(
    "--sql-outdir <dir>",
    "Output directory for the built sql.js module (defaults to parent of --outdir)",
  )
  .option(
    "--external <pkg...>",
    "Packages to keep external in the bundle (default: @schemavaults/dbh, kysely)",
  )
  .option("--debug", "Enable debug logging")
  .action(
    async (
      migrationsSrc: string,
      opts: {
        outdir: string;
        sqlModule: string;
        sqlOutdir?: string;
        external?: string[];
        debug?: boolean;
      },
    ) => {
      // Check that bun is available
      try {
        execSync("bun --version", { stdio: "ignore" });
      } catch {
        console.error(
          "Error: 'bun' is required for build-db-migrations but was not found in PATH.",
        );
        process.exit(1);
      }

      // Resolve path to build script relative to this CLI file
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const buildScriptPath = path.resolve(__dirname, "build-db-migrations.js");

      // Build args to forward
      const args: string[] = ["run", buildScriptPath, migrationsSrc];
      args.push("--outdir", opts.outdir);
      args.push("--sql-module", opts.sqlModule);
      if (opts.sqlOutdir) {
        args.push("--sql-outdir", opts.sqlOutdir);
      }
      if (opts.external && opts.external.length > 0) {
        args.push("--external", ...opts.external);
      }
      if (opts.debug) {
        args.push("--debug");
      }

      const child = spawn("bun", args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      child.on("close", (code) => {
        process.exit(code ?? 1);
      });
    },
  );

dbhCli
  .command("validate-migration-directory")
  .alias("validate")
  .description(
    "Validate the shape of a migrations directory (5-digit prefixes, up()/down() exports, no duplicate numbers)",
  )
  .argument("<folder>", "Path to the migrations directory")
  .option(
    "--duplicates-as-warnings",
    "Report duplicate migration numbers as warnings instead of errors",
  )
  .action(
    async (folder: string, opts: { duplicatesAsWarnings?: boolean }) => {
      const resolvedFolder = path.resolve(folder);

      let result;
      try {
        result = await validateMigrationDirectory(resolvedFolder, {
          duplicatesAsWarnings: opts.duplicatesAsWarnings,
        });
      } catch (error) {
        console.error("Failed to validate migration directory:", error);
        process.exit(1);
      }

      for (const issue of result.issues) {
        const prefix = issue.level === "error" ? "ERROR" : "WARN";
        console.error(`[${prefix}] ${issue.message}`);
      }

      if (result.ok) {
        const warningCount = result.issues.filter(
          (i) => i.level === "warning",
        ).length;
        console.log(
          `✓ Migration directory is valid (${result.migrationFiles.length} migration${
            result.migrationFiles.length === 1 ? "" : "s"
          } checked${warningCount > 0 ? `, ${warningCount} warning(s)` : ""}): ${result.directory}`,
        );
        process.exit(0);
      } else {
        const errorCount = result.issues.filter(
          (i) => i.level === "error",
        ).length;
        console.error(
          `✗ Migration directory is invalid (${errorCount} error(s)): ${result.directory}`,
        );
        process.exit(1);
      }
    },
  );

export default dbhCli;

dbhCli.parse();
