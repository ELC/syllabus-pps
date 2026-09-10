/**
 * One-time migration from a Logseq mirror (pages/*.md) to repo-native content/pages/.
 *
 * Usage:
 *   npx tsx scripts/migrate-logseq-once.ts <mirror-pages-dir> <output-content-dir>
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createLoadedConfig, slugifyTitle } from "@pps/core";

function inferKind(title: string, config: ReturnType<typeof createLoadedConfig>): string | undefined {
  const normalized = title.trim().toLocaleLowerCase("es-AR");
  if (normalized === "lds") {
    return "career";
  }
  if (config.expectedYearTitles.has(normalized)) {
    return "year";
  }
  if (config.expectedCourseTitles.has(normalized)) {
    return "course";
  }
  return undefined;
}

function migrateFile(sourcePath: string, outputDir: string, config: ReturnType<typeof createLoadedConfig>): void {
  const raw = readFileSync(sourcePath, "utf8");
  const title = basename(sourcePath).replace(/\.md$/i, "").normalize("NFC");
  const slug = slugifyTitle(title);
  let id: string | undefined;
  const bodyLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const idMatch = line.match(/^id::\s*(.+)$/);
    if (idMatch) {
      id = idMatch[1]?.trim();
      continue;
    }
    bodyLines.push(line);
  }

  const body = bodyLines.join("\n").trimEnd();
  const kind = inferKind(title, config);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `slug: ${slug}`,
    ...(kind ? [`kind: ${kind}`] : []),
    ...(id ? [`id: ${id}`] : []),
    `version: 1`,
    `updatedAt: ${new Date().toISOString()}`,
    "---",
    "",
  ].join("\n");

  writeFileSync(join(outputDir, `${slug}.md`), `${frontmatter}${body}\n`, "utf8");
}

function main(): void {
  const [sourceDir, outputDir] = process.argv.slice(2);
  if (!sourceDir || !outputDir) {
    throw new Error("Usage: migrate-logseq-once.ts <mirror-pages-dir> <output-content-dir>");
  }

  const config = createLoadedConfig({ years: [] });
  mkdirSync(outputDir, { recursive: true });

  for (const entry of readdirSync(sourceDir)) {
    const path = join(sourceDir, entry);
    if (!statSync(path).isFile() || !entry.endsWith(".md")) {
      continue;
    }
    migrateFile(path, outputDir, config);
  }

  process.stdout.write(`Migrated pages from ${sourceDir} to ${outputDir}\n`);
}

main();
