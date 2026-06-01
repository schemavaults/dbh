import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Extensions that are treated as migration modules. `.d.ts` declaration files
 * are explicitly ignored (handled separately below).
 */
const MIGRATION_FILE_EXTENSIONS = [
  ".ts",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
] as const;

/** Migration file names must begin with exactly 5 digits (e.g. 00000-foo.ts). */
const MIGRATION_PREFIX_REGEX = /^(\d{5})(?:\D|$)/;

export type MigrationValidationLevel = "error" | "warning";

export interface MigrationValidationIssue {
  level: MigrationValidationLevel;
  message: string;
  /** The offending file name (relative to the migration directory), if any. */
  file?: string;
}

export interface ValidateMigrationDirectoryOptions {
  /**
   * When true, duplicate migration numbers are reported as warnings instead of
   * errors (they will not, on their own, cause validation to fail).
   * @default false
   */
  duplicatesAsWarnings?: boolean;
}

export interface ValidateMigrationDirectoryResult {
  /** True when there are no `error`-level issues. */
  ok: boolean;
  /** The absolute path that was validated. */
  directory: string;
  /** The migration file names that were considered (relative to `directory`). */
  migrationFiles: string[];
  issues: MigrationValidationIssue[];
}

function isMigrationFile(fileName: string): boolean {
  if (fileName.startsWith(".")) {
    // Ignore hidden/dotfiles.
    return false;
  }
  if (fileName.endsWith(".d.ts")) {
    // Ignore TypeScript declaration files.
    return false;
  }
  return MIGRATION_FILE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Validates the shape of an opinionated Kysely migrations directory.
 *
 * Asserts that the directory:
 *  - exists and is non-empty,
 *  - contains only files prefixed with a 5-digit migration number,
 *  - has no duplicate migration numbers (branch collisions), and
 *  - exports an `up()` and `down()` function from every migration module.
 */
export async function validateMigrationDirectory(
  directory: string,
  options: ValidateMigrationDirectoryOptions = {},
): Promise<ValidateMigrationDirectoryResult> {
  const { duplicatesAsWarnings = false } = options;
  const resolved = path.resolve(directory);
  const issues: MigrationValidationIssue[] = [];

  if (!fs.existsSync(resolved)) {
    return {
      ok: false,
      directory: resolved,
      migrationFiles: [],
      issues: [
        {
          level: "error",
          message: `Migration directory does not exist: ${resolved}`,
        },
      ],
    };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return {
      ok: false,
      directory: resolved,
      migrationFiles: [],
      issues: [
        {
          level: "error",
          message: `Migration path is not a directory: ${resolved}`,
        },
      ],
    };
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && isMigrationFile(entry.name))
    .map((entry) => entry.name)
    .sort();

  // 1) Directory must be non-empty.
  if (migrationFiles.length === 0) {
    issues.push({
      level: "error",
      message: `Migration directory is empty (no migration files found): ${resolved}`,
    });
    return {
      ok: false,
      directory: resolved,
      migrationFiles,
      issues,
    };
  }

  // 2) Every file must be prefixed with a 5-digit migration number.
  // Track which numbers map to which files for duplicate detection.
  const numberToFiles = new Map<string, string[]>();
  for (const file of migrationFiles) {
    const match = MIGRATION_PREFIX_REGEX.exec(file);
    if (!match) {
      issues.push({
        level: "error",
        file,
        message: `File is not prefixed with a 5-digit migration number (e.g. 00000-my-migration.ts): ${file}`,
      });
      continue;
    }
    const number = match[1];
    const existing = numberToFiles.get(number);
    if (existing) {
      existing.push(file);
    } else {
      numberToFiles.set(number, [file]);
    }
  }

  // 3) No duplicate migration numbers (collisions across branches).
  for (const [number, files] of numberToFiles) {
    if (files.length > 1) {
      issues.push({
        level: duplicatesAsWarnings ? "warning" : "error",
        message: `Duplicate migration number '${number}' used by ${files.length} files: ${files.join(", ")}`,
      });
    }
  }

  // 4) Every module must export an up() and down() function.
  for (const file of migrationFiles) {
    const fullPath = path.join(resolved, file);
    let mod: Record<string, unknown>;
    try {
      mod = (await import(pathToFileURL(fullPath).href)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      issues.push({
        level: "error",
        file,
        message: `Failed to import migration module '${file}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      continue;
    }

    if (typeof mod.up !== "function") {
      issues.push({
        level: "error",
        file,
        message: `Migration '${file}' does not export an up() function`,
      });
    }
    if (typeof mod.down !== "function") {
      issues.push({
        level: "error",
        file,
        message: `Migration '${file}' does not export a down() function`,
      });
    }
  }

  const ok = !issues.some((issue) => issue.level === "error");
  return {
    ok,
    directory: resolved,
    migrationFiles,
    issues,
  };
}

export default validateMigrationDirectory;
