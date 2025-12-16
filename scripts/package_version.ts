import { join } from "path";
import { existsSync, readFileSync } from "fs";

export default function packageVersion(): string {
  const packageJsonPath = join(__dirname, "..", "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }

  const packageJson: string = readFileSync(packageJsonPath, "utf8");
  const json = JSON.parse(packageJson);
  if (typeof json !== "object" || !json) {
    throw new Error("Invalid package.json");
  }
  if (
    !("version" in json) ||
    typeof json.version !== "string" ||
    json.version.length === 0
  ) {
    throw new Error("Invalid package.json; missing version");
  }
  const version: string = json.version;
  return version;
}

if (require.main === module) {
  process.stdout.write(packageVersion().trim());
}
