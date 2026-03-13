/* global Bun */
import { Command } from "commander";
import { existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { type BunPlugin } from "bun";

const buildDbMigrations = new Command();

buildDbMigrations
  .name("build-db-migrations")
  .description(
    "Build TypeScript Kysely migration files into JavaScript using Bun's bundler",
  )
  .argument("<migrations-src>", "Directory containing .ts migration source files")
  .requiredOption("--outdir <dir>", "Output directory for compiled migration .js files")
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
    "Packages to keep external in the bundle",
    ["@schemavaults/dbh", "kysely"],
  )
  .option("--debug", "Enable debug logging", false)
  .action(
    async (
      migrationsSrc: string,
      opts: {
        outdir: string;
        sqlModule: string;
        sqlOutdir?: string;
        external: string[];
        debug: boolean;
      },
    ) => {
      const debug = opts.debug;
      const migrationsSrcDir = resolve(migrationsSrc);
      const outdir = resolve(opts.outdir);
      const sqlModuleSrc = resolve(opts.sqlModule);
      const sqlOutdir = opts.sqlOutdir ? resolve(opts.sqlOutdir) : resolve(outdir, "..");

      // Validate inputs
      if (!existsSync(migrationsSrcDir)) {
        console.error(
          `Error: Migrations source directory not found: ${migrationsSrcDir}`,
        );
        process.exit(1);
      }

      if (!existsSync(sqlModuleSrc)) {
        console.error(`Error: sql.ts source module not found: ${sqlModuleSrc}`);
        process.exit(1);
      }

      // Get all .ts migration files
      const migrationFiles = readdirSync(migrationsSrcDir)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => join(migrationsSrcDir, file));

      if (migrationFiles.length === 0) {
        console.error("Error: No .ts migration files found");
        process.exit(1);
      }

      console.log(
        `Found ${migrationFiles.length} source .ts migration files to compile!`,
      );

      // Clear and create output directories
      if (existsSync(outdir)) {
        rmSync(outdir, { recursive: true });
      }
      mkdirSync(outdir, { recursive: true });

      const sqlModuleDist = join(sqlOutdir, "sql.js");
      if (existsSync(sqlModuleDist)) {
        rmSync(sqlModuleDist);
      }

      // Marker used for sql imports - will be replaced in post-processing
      const SQL_IMPORT_MARKER = "__sql_external__";

      const sqlImportRewriterPlugin: BunPlugin = {
        name: "db-migrations-sql-import-rewriter",
        setup(build) {
          build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, async (args) => {
            const text = await Bun.file(args.path).text();

            const modifiedText = text
              .replace(
                /import\s+{([^}]+)}\s+from\s+['"]@\/sql['"]/g,
                `import {$1} from "${SQL_IMPORT_MARKER}"`,
              )
              .replace(
                /import\s+sql\s+from\s+['"]@\/sql['"]/g,
                `import { sql } from "${SQL_IMPORT_MARKER}"`,
              );

            if (debug && text !== modifiedText) {
              console.log(
                `[db-migrations-sql-import-rewriter] onLoad(${args.path})`,
              );
            }

            return {
              contents: modifiedText,
              loader: "ts",
            };
          });
        },
      };

      // Build migrations
      const migrationsResult = await Bun.build({
        entrypoints: [...migrationFiles],
        root: migrationsSrcDir,
        outdir,
        target: "node",
        sourcemap: "none",
        plugins: [sqlImportRewriterPlugin],
        external: [SQL_IMPORT_MARKER, ...opts.external],
      });

      if (!migrationsResult.success) {
        console.error("Migration build failed:");
        for (const log of migrationsResult.logs) {
          console.error(log);
        }
        process.exit(1);
      }

      // Build sql module
      const sqlResult = await Bun.build({
        entrypoints: [sqlModuleSrc],
        outdir: sqlOutdir,
        target: "node",
        sourcemap: "none",
      });

      if (!sqlResult.success) {
        console.error("SQL module build failed:");
        for (const log of sqlResult.logs) {
          console.error(log);
        }
        process.exit(1);
      }

      if (!existsSync(sqlModuleDist)) {
        console.error("Expected sql.js to exist after build operation!");
        process.exit(1);
      }

      // Post-process migration outputs to replace marker with actual import path
      const targetImport = relative(outdir, sqlModuleDist).replace(/\\/g, "/");

      for (const output of migrationsResult.outputs) {
        const content = await Bun.file(output.path).text();

        if (content.includes(SQL_IMPORT_MARKER)) {
          const rewrittenContent = content.replace(
            new RegExp(`from\\s+["']${SQL_IMPORT_MARKER}["']`, "g"),
            `from "${targetImport}"`,
          );
          await Bun.write(output.path, rewrittenContent);

          if (debug) {
            console.log(
              `[post-process] Rewrote ${SQL_IMPORT_MARKER} => ${targetImport} in ${basename(output.path)}`,
            );
          }
        }
      }

      // Post-build assertions
      const migrationsDirContents: readonly string[] = await readdir(outdir, {
        recursive: false,
      });
      for (const file of migrationsDirContents) {
        if (!file.endsWith(".js")) {
          throw new Error(
            "Expected all files in output migrations directory to end with .js!",
          );
        }
      }

      // Print summary
      console.log("");
      console.log("Built migrations:");
      for (const migration of migrationsResult.outputs) {
        console.log(`  - ${basename(migration.path)} (${migration.size} bytes)`);
      }
      console.log("");
      console.log(
        `Total: ${migrationsResult.outputs.length} migration(s) built`,
      );

      if (sqlResult.outputs.length !== 1 || !sqlResult.outputs[0]) {
        console.error(
          "Expected there to be exactly one output from sql.js module write!",
        );
      }
      console.log(
        `Wrote supporting sql.js module to: ${sqlResult.outputs[0]!.path} (${sqlResult.outputs[0]!.size} bytes)`,
      );

      console.log(
        "[build-db-migrations] Successfully built database migrations!",
      );
    },
  );

export default buildDbMigrations;

const isDirectRun =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  buildDbMigrations.parse();
}
