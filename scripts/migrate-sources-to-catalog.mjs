#!/usr/bin/env node
/**
 * One-time migration: extract URLs from concept bullets, build content/resources.json,
 * replace trailing URLs with [@resource-id] citations.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PAGES_DIR = join(ROOT, "content", "pages");
const CATALOG_PATH = join(ROOT, "content", "resources.json");
const ACCESSED = { raw: "2026-09-14" };

const URL_PATTERN = /https?:\/\/[^\s)\]]+/g;

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function trimUrl(url) {
  return url.replace(/[.,;:!?]+$/g, "");
}

function canonicalUrl(url) {
  try {
    const parsed = new URL(trimUrl(url));
    parsed.hash = "";
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return trimUrl(url);
  }
}

function issuedFromText(text) {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return { raw: yearMatch[0] };
  }
  return undefined;
}

function inferType(url, text) {
  const lower = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(lower)) return "motion_picture";
  if (/\b(libro|book|isbn|edici[oó]n|\bed\.)\b/i.test(text)) return "book";
  if (/wikipedia\.org/.test(lower)) return "webpage";
  if (/docs\.|developer\.mozilla\.org|readthedocs/.test(lower)) return "software";
  if (/coursera\.org|edx\.org|ocw\.mit\.edu/.test(lower)) return "webpage";
  if (/\.pdf(\?|$)/.test(lower)) return "book";
  return "webpage";
}

function extractBookMeta(text) {
  const match = text.match(
    /(?:El libro|libro)\s+(.+?)\s*(?:\(([^)]+)\))?\s*(?:de|by)\s+([^;,.]+)/i,
  );
  if (!match) return null;
  const title = match[1].trim();
  const editionRaw = match[2]?.trim();
  const authorName = match[3].trim();
  const yearMatch = editionRaw?.match(/\b(19|20)\d{2}\b/);
  return {
    title,
    edition: editionRaw,
    author: [{ literal: authorName }],
    publisher: authorName,
    issued: yearMatch ? { raw: yearMatch[0] } : undefined,
  };
}

function extractTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const last = pathParts[pathParts.length - 1] ?? host;
    const decoded = decodeURIComponent(last.replace(/\.(html|pdf|htm)$/i, ""));
    return decoded.replace(/[-_+]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

function publisherFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const map = {
      "es.wikipedia.org": "Wikimedia Foundation",
      "en.wikipedia.org": "Wikimedia Foundation",
      "developer.mozilla.org": "Mozilla",
      "docs.python.org": "Python Software Foundation",
      "docs.docker.com": "Docker Inc.",
      "martinfowler.com": "Martin Fowler",
      "cheatsheetseries.owasp.org": "OWASP Foundation",
      "scrumguides.org": "Scrum.org",
      "pythoninstitute.org": "Python Institute",
      "coursera.org": "Coursera",
      "freecodecamp.org": "freeCodeCamp",
      "youtube.com": "YouTube",
      "youtu.be": "YouTube",
    };
    return map[host] ?? host;
  } catch {
    return "Unknown";
  }
}

function authorFromText(text, url) {
  if (/wikipedia/i.test(text)) {
    return [{ literal: "Wikipedia" }];
  }
  if (/\bMDN\b/.test(text)) {
    return [{ literal: "Mozilla Developer Network" }];
  }
  const videoMatch = text.match(/(?:video de|curso en video de|playlist de)\s+([^,.]+)/i);
  if (videoMatch) {
    return [{ literal: videoMatch[1].trim() }];
  }
  const martinMatch = text.match(/Martin Fowler/i);
  if (martinMatch) {
    return [{ literal: "Martin Fowler" }];
  }
  return [{ literal: publisherFromUrl(url) }];
}

function buildEntry(url, sampleText) {
  const type = inferType(url, sampleText);
  const bookMeta = type === "book" ? extractBookMeta(sampleText) : null;
  const title =
    bookMeta?.title ??
    extractTitleFromUrl(url) ??
    sampleText.replace(URL_PATTERN, "").trim().slice(0, 120);
  const baseId = slugify(bookMeta?.title ?? `${new URL(url).hostname}-${title}`);
  const issued = bookMeta?.issued ?? issuedFromText(sampleText) ?? ACCESSED;

  const entry = {
    id: baseId,
    type,
    title,
    author: bookMeta?.author ?? authorFromText(sampleText, url),
    publisher: bookMeta?.publisher ?? publisherFromUrl(url),
    issued,
    accessed: ACCESSED,
    URL: url,
  };

  if (bookMeta?.edition) {
    entry.edition = bookMeta.edition;
  }

  if (/coursera\.org|edx\.org/.test(url)) {
    entry.genre = "course";
  }

  if (type === "book" && !bookMeta) {
    entry.type = "webpage";
  }

  return entry;
}

function ensureUniqueId(id, used) {
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let index = 2;
  while (used.has(`${id}-${index}`)) index += 1;
  const next = `${id}-${index}`;
  used.add(next);
  return next;
}

function collectBullets() {
  const bullets = [];
  for (const file of readdirSync(PAGES_DIR).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(join(PAGES_DIR, file), "utf8");
    if (!/^kind:\s*concept/m.test(content)) continue;
    content.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/^\s*-\s+(.*)$/);
      if (!match) return;
      const text = match[1];
      for (const rawUrl of text.match(URL_PATTERN) ?? []) {
        bullets.push({
          file,
          line: index + 1,
          text,
          url: canonicalUrl(rawUrl),
        });
      }
    });
  }
  return bullets;
}

function main() {
  const bullets = collectBullets();
  const byUrl = new Map();
  for (const bullet of bullets) {
    if (!byUrl.has(bullet.url)) {
      byUrl.set(bullet.url, bullet.text);
    }
  }

  const usedIds = new Set();
  const urlToId = new Map();
  const catalog = [];

  for (const [url, text] of byUrl.entries()) {
    const draft = buildEntry(url, text);
    draft.id = ensureUniqueId(draft.id, usedIds);
    urlToId.set(url, draft.id);
    catalog.push(draft);
  }

  catalog.sort((a, b) => a.id.localeCompare(b.id, "es-AR"));
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  let migratedFiles = 0;
  for (const file of readdirSync(PAGES_DIR).filter((f) => f.endsWith(".md"))) {
    const path = join(PAGES_DIR, file);
    let content = readFileSync(path, "utf8");
    if (!/^kind:\s*concept/m.test(content)) continue;

    const original = content;
    content = content.replace(/^\s*(-\s+.*?)(https?:\/\/[^\s)\]]+)/gm, (full, prefix, rawUrl) => {
      const url = canonicalUrl(rawUrl);
      const id = urlToId.get(url);
      if (!id) return full;
      const cleanedPrefix = prefix.replace(/\s+$/, "");
      return `${cleanedPrefix} [@${id}]`;
    });

    if (content !== original) {
      writeFileSync(path, content, "utf8");
      migratedFiles += 1;
    }
  }

  console.log(`Catalog: ${catalog.length} entries -> ${CATALOG_PATH}`);
  console.log(`Migrated ${migratedFiles} concept page(s), ${bullets.length} citation(s).`);
}

main();
