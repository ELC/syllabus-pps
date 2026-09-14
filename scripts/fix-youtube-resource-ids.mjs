#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CATALOG = join(ROOT, "content", "resources.json");
const PAGES = join(ROOT, "content", "pages");
const FIXTURE_CATALOG = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "resources.json");
const FIXTURE_PAGES = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "pages");
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSegment(value) {
  return value
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function youtubeId(url) {
  const parsed = new URL(url);
  const video = parsed.searchParams.get("v");
  if (video) {
    const segment = normalizeSegment(video);
    return segment ? `yt-${segment}` : null;
  }
  const list = parsed.searchParams.get("list");
  if (list) {
    const segment = normalizeSegment(list.slice(-12));
    return segment ? `yt-pl-${segment}` : null;
  }
  return null;
}

function fixCatalog(catalogPath, pagesDir) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const entry of catalog) {
    if (!ID_RE.test(entry.id) && entry.URL.includes("youtube")) {
      const next = youtubeId(entry.URL);
      if (next && ID_RE.test(next)) {
        map.set(entry.id, next);
      }
    }
  }

  const used = new Set(catalog.map((entry) => entry.id).filter((id) => ID_RE.test(id)));
  for (const [oldId, base] of map) {
    let next = base;
    let index = 2;
    while (used.has(next)) {
      next = `${base}-${index}`;
      index += 1;
    }
    used.add(next);
    map.set(oldId, next);
  }

  for (const entry of catalog) {
    if (map.has(entry.id)) {
      entry.id = map.get(entry.id);
    }
  }

  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  for (const file of readdirSync(pagesDir).filter((name) => name.endsWith(".md"))) {
    const path = join(pagesDir, file);
    let text = readFileSync(path, "utf8");
    let changed = false;
    for (const [oldId, newId] of map) {
      const token = `[@${oldId}]`;
      if (text.includes(token)) {
        text = text.replaceAll(token, `[@${newId}]`);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(path, text, "utf8");
    }
  }

  return map;
}

const mainMap = fixCatalog(CATALOG, PAGES);
fixCatalog(FIXTURE_CATALOG, FIXTURE_PAGES);
console.log(`Fixed ${mainMap.size} YouTube resource IDs`);
