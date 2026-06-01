import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { validateMigrationDirectory } from "@/utils/validateMigrationDirectory";

const UP_DOWN_MODULE =
  "export async function up(){}\nexport async function down(){}\n";

describe("validateMigrationDirectory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dbh-validate-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeMigration(name: string, contents = UP_DOWN_MODULE): void {
    fs.writeFileSync(path.join(tmpDir, name), contents);
  }

  test("passes for the bundled example migrations", async () => {
    const exampleDir = path.resolve(__dirname, "./example-migrations");
    const result = await validateMigrationDirectory(exampleDir);
    expect(result.ok).toBeTrue();
    expect(result.issues).toBeEmpty();
    expect(result.migrationFiles.length).toBeGreaterThan(0);
  });

  test("passes for a well-formed directory", async () => {
    writeMigration("00000-first.ts");
    writeMigration("00001-second.ts");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeTrue();
    expect(result.issues).toBeEmpty();
    expect(result.migrationFiles).toEqual([
      "00000-first.ts",
      "00001-second.ts",
    ]);
  });

  test("fails when the directory does not exist", async () => {
    const result = await validateMigrationDirectory(
      path.join(tmpDir, "nope"),
    );
    expect(result.ok).toBeFalse();
    expect(result.issues.some((i) => i.level === "error")).toBeTrue();
  });

  test("fails when the directory is empty", async () => {
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
    expect(result.issues[0]?.message).toContain("empty");
  });

  test("fails when a file is not prefixed with a 5-digit number", async () => {
    writeMigration("00000-ok.ts");
    writeMigration("bad-name.ts");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
    expect(
      result.issues.some(
        (i) => i.file === "bad-name.ts" && i.level === "error",
      ),
    ).toBeTrue();
  });

  test("fails for a 6-digit prefix (must be exactly 5 digits)", async () => {
    writeMigration("000001-too-long.ts");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
  });

  test("flags duplicate migration numbers as an error by default", async () => {
    writeMigration("00040-a.ts");
    writeMigration("00040-b.ts");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
    const dupIssue = result.issues.find((i) =>
      i.message.includes("Duplicate migration number"),
    );
    expect(dupIssue).toBeDefined();
    expect(dupIssue?.level).toBe("error");
  });

  test("can downgrade duplicate migration numbers to warnings", async () => {
    writeMigration("00040-a.ts");
    writeMigration("00040-b.ts");
    const result = await validateMigrationDirectory(tmpDir, {
      duplicatesAsWarnings: true,
    });
    expect(result.ok).toBeTrue();
    const dupIssue = result.issues.find((i) =>
      i.message.includes("Duplicate migration number"),
    );
    expect(dupIssue?.level).toBe("warning");
  });

  test("fails when a module is missing up()", async () => {
    writeMigration("00000-x.ts", "export async function down(){}\n");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
    expect(result.issues.some((i) => i.message.includes("up()"))).toBeTrue();
  });

  test("fails when a module is missing down()", async () => {
    writeMigration("00000-x.ts", "export async function up(){}\n");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeFalse();
    expect(result.issues.some((i) => i.message.includes("down()"))).toBeTrue();
  });

  test("ignores .d.ts declaration files and dotfiles", async () => {
    writeMigration("00000-first.ts");
    writeMigration("types.d.ts", "export type Foo = string;\n");
    writeMigration(".gitkeep", "");
    const result = await validateMigrationDirectory(tmpDir);
    expect(result.ok).toBeTrue();
    expect(result.migrationFiles).toEqual(["00000-first.ts"]);
  });
});
