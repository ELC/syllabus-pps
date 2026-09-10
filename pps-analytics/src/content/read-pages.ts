import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PageSource } from "@pps/core";

export function readPageSources(contentDir: string): PageSource[] {
  const entries = readdirSync(contentDir);
  return entries
    .map((entry) => join(contentDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .filter((entryPath) => entryPath.toLocaleLowerCase("es-AR").endsWith(".md"))
    .sort((left, right) =>
      relative(contentDir, left).localeCompare(relative(contentDir, right), "es-AR"),
    )
    .map((filePath) => ({
      path: relative(contentDir, filePath).replace(/\\/g, "/"),
      content: readFileSync(filePath, "utf8"),
    }));
}
