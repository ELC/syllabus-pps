import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function snapshotBuildInputs(dirs: string[], files: string[]): string {
  return [
    ...dirs.flatMap((dir) => markdownFingerprints(dir)),
    ...files.flatMap((file) => fileFingerprint(file)),
  ]
    .sort((a, b) => a.localeCompare(b, "es-AR"))
    .join("\n");
}

function fileFingerprint(file: string): string[] {
  if (!existsSync(file)) {
    return [];
  }

  const stats = statSync(file);
  return [`${file}:${stats.mtimeMs}:${stats.size}`];
}

function markdownFingerprints(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return markdownFingerprints(entryPath);
    }

    if (!entry.isFile() || !entry.name.toLocaleLowerCase("es-AR").endsWith(".md")) {
      return [];
    }

    const stats = statSync(entryPath);
    return [`${entryPath}:${stats.mtimeMs}:${stats.size}`];
  });
}
