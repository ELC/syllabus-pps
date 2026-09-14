import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseResourceCatalogJson, ResourceCatalogEntry } from "@pps/core";

export function defaultResourcesPath(contentRoot: string): string {
  return join(resolve(contentRoot, ".."), "resources.json");
}

export function readResourceCatalog(contentRoot: string): ResourceCatalogEntry[] {
  const catalogPath = defaultResourcesPath(contentRoot);
  try {
    const text = readFileSync(catalogPath, "utf8");
    return parseResourceCatalogJson(text).entries;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
