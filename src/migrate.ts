// migrate.ts

import {
  Kysely,
  Migrator,
  FileMigrationProvider,
  type MigrationResultSet,
} from "kysely";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export interface IMigrationResult {
  migrationName: string;
  status: "Success" | "Error" | "NotExecuted";
  direction: "Up" | "Down";
}

export interface IMigrateOptions {
  db: Kysely<any>;
  migrationFolder: string;
  version?: string;
}

export interface IReverseOptions {
  db: Kysely<any>;
  migrationFolder: string;
  version: string;
}

function createMigrator({ db, migrationFolder }: IMigrateOptions): Migrator {
  return new Migrator({
    db: db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });
}

function validateMigrationResultFormat(
  migration_result: unknown,
): migration_result is IMigrationResult {
  if (typeof migration_result !== "object" || !migration_result) {
    throw new TypeError("Expected migration result to be an object!");
  }
  if (
    !("migrationName" in migration_result) ||
    typeof migration_result.migrationName !== "string"
  ) {
    throw new TypeError(
      "Expected migration result's 'migrationName' to be a string!",
    );
  } else if (
    !("direction" in migration_result) ||
    typeof migration_result.direction !== "string"
  ) {
    throw new TypeError(
      "Expected migration result's 'direction' to be a string!",
    );
  } else if (
    !("status" in migration_result) ||
    typeof migration_result.status !== "string"
  ) {
    throw new TypeError("Expected migration result's 'status' to be a string!");
  } else if (!["Up", "Down"].includes(migration_result.direction)) {
    throw new TypeError(
      "Expected migration result's 'direction' to be one of: 'Up' or 'Down'!",
    );
  } else if (
    !["Success", "Error", "NotExecuted"].includes(migration_result.status)
  ) {
    throw new TypeError(
      "Expected migration result's 'status' to be one of: 'Success', 'Error', or 'NotExecuted'!",
    );
  }
  return true;
}

function validateMigrationResultFormats(
  results: readonly unknown[],
): results is readonly IMigrationResult[] {
  if (!Array.isArray(results)) {
    throw new TypeError("Expected 'results' to be an array!");
  }
  for (const migration_result of results) {
    validateMigrationResultFormat(migration_result);
  }
  return true;
}

export async function migrate({
  db,
  migrationFolder,
  ...opts
}: IMigrateOptions): Promise<readonly IMigrationResult[]> {
  if (typeof migrationFolder !== "string") {
    throw new Error("migrationFolder must be a string");
  }

  if (!existsSync(migrationFolder)) {
    throw new Error(`migrationFolder '${migrationFolder}' does not exist`);
  }

  const migrator = createMigrator({ db, migrationFolder });

  let result: MigrationResultSet;
  if (typeof opts.version === "string") {
    result = await migrator.migrateTo(opts.version);
  } else {
    result = await migrator.migrateToLatest();
  }
  const { error, results } = result;
  if (error) {
    console.error(error);
    throw error;
  }

  if (!results) {
    return [];
  }

  if (!validateMigrationResultFormats(results)) {
    throw new TypeError(
      "Migration appears to have succeeded but failed to parse received results!",
    );
  }

  return results satisfies readonly IMigrationResult[];
}

export async function reverse({
  db,
  migrationFolder,
  version,
}: IReverseOptions): Promise<IMigrationResult[]> {
  if (typeof migrationFolder !== "string") {
    throw new Error("migrationFolder must be a string");
  }

  if (!existsSync(migrationFolder)) {
    throw new Error(`migrationFolder '${migrationFolder}' does not exist`);
  }

  const migrator = createMigrator({ db, migrationFolder });

  const { error, results } = await migrator.migrateTo(version);
  if (error) {
    console.error(error);
    throw error;
  }

  if (!results) {
    return [];
  }

  if (!validateMigrationResultFormats(results)) {
    throw new TypeError(
      "Reverse migration appears to have succeeded but failed to parse received results!",
    );
  }

  return results;
}

export default migrate;
