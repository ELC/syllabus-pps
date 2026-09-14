#!/usr/bin/env node
/**
 * Fetch real YouTube titles via oEmbed, derive lean resource IDs from titles,
 * and update catalog entries plus [@resource-id] citations.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CATALOG_PATH = join(ROOT, "content", "resources.json");
const PAGES_DIR = join(ROOT, "content", "pages");
const FIXTURE_CATALOG = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "resources.json");
const FIXTURE_PAGES = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "pages");
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return slug;
}

function issuedFromTitle(title) {
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  return { raw: match[0] };
}

async function fetchOEmbed(url) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  if (!response.ok) {
    throw new Error(`oEmbed ${response.status} for ${url}`);
  }
  return response.json();
}

function ensureUnique(baseId, used) {
  if (!used.has(baseId)) {
    used.add(baseId);
    return baseId;
  }
  let index = 2;
  while (used.has(`${baseId}-${index}`)) index += 1;
  const next = `${baseId}-${index}`;
  used.add(next);
  return next;
}

function replaceCitations(text, idMap) {
  let updated = text;
  for (const [oldId, newId] of idMap) {
    updated = updated.replaceAll(`[@${oldId}]`, `[@${newId}]`);
  }
  return updated;
}

function updateMarkdownDir(dir, idMap) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const path = join(dir, file);
    const original = readFileSync(path, "utf8");
    const updated = replaceCitations(original, idMap);
    if (updated !== original) {
      writeFileSync(path, updated, "utf8");
    }
  }
}

async function enrichCatalog(catalogPath, pagesDir) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const youtubeEntries = catalog.filter((entry) => /youtube|youtu\.be/i.test(entry.URL));
  const nonYoutubeIds = new Set(
    catalog.filter((entry) => !/youtube|youtu\.be/i.test(entry.URL)).map((entry) => entry.id),
  );
  const used = new Set(nonYoutubeIds);
  /** @type {Map<string, string>} */
  const idMap = new Map();

  for (const entry of youtubeEntries) {
    const meta = await fetchOEmbed(entry.URL);
    const title = meta.title?.trim();
    if (!title) {
      throw new Error(`Missing title for ${entry.URL}`);
    }

    const baseId = slugify(title);
    if (!baseId || !ID_RE.test(baseId)) {
      throw new Error(`Invalid slug for title "${title}" (${entry.URL})`);
    }

    const nextId = ensureUnique(baseId, used);
    idMap.set(entry.id, nextId);

    entry.id = nextId;
    entry.title = title;
    entry.author = [{ literal: meta.author_name?.trim() || "YouTube" }];
    entry.publisher = "YouTube";

    const issued = issuedFromTitle(title);
    if (issued) {
      entry.issued = issued;
    }
  }

  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  updateMarkdownDir(pagesDir, idMap);
  return { idMap, count: youtubeEntries.length };
}

async function main() {
  const main = await enrichCatalog(CATALOG_PATH, PAGES_DIR);
  const fixture = await enrichCatalog(FIXTURE_CATALOG, FIXTURE_PAGES);

  console.log(`Updated ${main.count} YouTube resources in content catalog`);
  console.log(`Updated ${fixture.count} YouTube resources in fixture catalog`);
  console.log("Sample renames:");
  for (const [oldId, newId] of [...main.idMap.entries()].slice(0, 12)) {
    console.log(`  ${oldId} -> ${newId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
