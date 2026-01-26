// migrate.ts

import {
  Kysely,
  Migrator,
  FileMigrationProvider,
  type MigrationResultSet,
  MigrationResult,
} from "kysely";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

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

export async function migrate({
  db,
  migrationFolder,
  ...opts
}: IMigrateOptions): Promise<MigrationResult[] | undefined> {
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

  return results;
}

export async function reverse({
  db,
  migrationFolder,
  version,
}: IReverseOptions): Promise<MigrationResult[] | undefined> {
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

  return results;
}

export default migrate;
