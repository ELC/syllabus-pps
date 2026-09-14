#!/usr/bin/env node
/**
 * Refactor resource catalog IDs to lean kebab-case names without es/www/en prefixes.
 * Updates content/resources.json and all [@resource-id] citations in content/pages/.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CATALOG_PATH = join(ROOT, "content", "resources.json");
const PAGES_DIR = join(ROOT, "content", "pages");
const FIXTURE_CATALOG = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "resources.json");
const FIXTURE_PAGES = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "pages");

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** @type {Record<string, string>} */
const MANUAL_IDS = {
  abierto: "open-logic-project",
  "abierto-introduction-to-software-engineering-en-wikibooks-explic": "wikibooks-software-engineering-uml",
  "abierto-que-trata-derivadas-criterios": "active-calculus",
  "abierto-the-real-startup-book-2-ed-editado-por-tristan-kromer-re": "real-startup-book",
  breve: "ddd-quickly",
  "cs50-harvard-edu-3": "cs50-notes-3",
  "de-codigo-abierto-the-docker-handbook": "docker-handbook",
  "drawio-app-com-uml-use-case-diagrams-with-draw-io": "drawio-use-case-diagrams",
  "frameworkless-js-org-frameworkless-js-org": "frameworkless-js",
  "gratuito-web-api-design-the-missing-link-apigee-2016-discute-dis": "apigee-api-design",
  "help-structorizer-fisch-lu-index-php": "structorizer",
  "ocw-mit-edu-lecture-videos": "mit-6-1200j-lectures",
  "openintro-statistics-4-ed-2019-es": "openintro-statistics",
  "relax-mad-uom-gr-relax-mad-uom-gr": "relax",
  "seeing-theory-brown-edu-frequentist-inference": "seeing-theory-frequentist",
  "sqlbolt-com-sqlbolt-com": "sqlbolt",
  "textbooks-math-gatech-edu-matrix-equations": "gatech-matrix-equations",
  "textbooks-math-gatech-edu-matrix-transformations": "gatech-matrix-transformations",
  "textbooks-math-gatech-edu-row-reduction": "gatech-row-reduction",
  "textbooks-math-gatech-edu-vectors": "gatech-vectors",
  "visualgo-net-en": "visualgo",
  "visualgo-net-sorting": "visualgo-sorting",
  "www-agilealliance-org-acceptance-test": "agile-alliance-acceptance-test",
  "www-atlassian-com-acceptance-criteria": "atlassian-acceptance-criteria",
  "www-atlassian-com-continuous-integration-vs-delivery-vs-deployme": "atlassian-ci-cd",
  "www-coursera-org-agile-development-and-scrum": "coursera-agile-scrum",
  "www-coursera-org-agile-essentials": "coursera-agile-essentials",
  "www-coursera-org-algorithms": "coursera-algorithms",
  "www-coursera-org-critical-thinking-logical-reasoning": "coursera-critical-thinking",
  "www-coursera-org-data-structures-algorithms": "coursera-data-structures",
  "www-coursera-org-linear-algebra-elementary-to-advanced": "coursera-linear-algebra",
  "www-coursera-org-logic-critical-thinking-duke": "coursera-logic-duke",
  "www-coursera-org-mathematical-proofs": "coursera-mathematical-proofs",
  "www-coursera-org-mathematical-thinking": "coursera-mathematical-thinking",
  "www-cs-umd-edu-nsd": "umd-nsd",
  "www-db-fiddle-com-db-fiddle-com": "db-fiddle",
  "www-drawio-com-entity-relationship-tables": "drawio-er-diagrams",
  "www-frameworklessmovement-org-frameworklessmovement-org": "frameworkless-movement",
  "www-freecodecamp-org-an-introduction-to-docker-and-containers-fo": "freecodecamp-docker",
  "www-freecodecamp-org-four-pillars-of-object-oriented-programming": "freecodecamp-oop",
  "www-freecodecamp-org-learn-continuous-integration-delivery-and-d": "freecodecamp-ci-cd",
  "www-martinfowler-com-continuousintegration": "fowler-continuous-integration",
  "www-nngroup-com-ten-usability-heuristics": "nng-usability-heuristics",
  "www-nngroup-com-usability-testing-101": "nng-usability-testing",
  "www-postgresql-org-tutorial-transactions": "postgresql-transactions",
  "www-redbook-io-redbook-io": "redbook",
  "www-romaglushko-com-whats-aouth2": "oauth2-explained",
  "www-visual-paradigm-com-what-is-use-case-diagram": "visual-paradigm-use-case",
};

function normalizeSegment(value) {
  return value
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const segment = normalizeSegment(parsed.pathname.slice(1).split("/")[0] ?? "");
      return segment ? `yt-${segment}` : undefined;
    }
    const video = parsed.searchParams.get("v");
    if (video) {
      const segment = normalizeSegment(video);
      return segment ? `yt-${segment}` : undefined;
    }
    const list = parsed.searchParams.get("list");
    if (list) {
      const segment = normalizeSegment(list.slice(-12));
      return segment ? `yt-pl-${segment}` : undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function pathTail(url, segments = 1) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.slice(-segments).join("-");
  } catch {
    return "";
  }
}

function domainKey(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch {
    return "";
  }
}

function leanId(entry) {
  const { id, URL: url, title } = entry;

  if (MANUAL_IDS[id]) {
    return MANUAL_IDS[id];
  }

  if (id.startsWith("es-wikipedia-org-")) {
    return id.slice("es-wikipedia-org-".length);
  }

  if (id.startsWith("en-wikipedia-org-")) {
    return id.slice("en-wikipedia-org-".length);
  }

  if (id.startsWith("en-wikibooks-org-")) {
    return `wikibooks-${id.slice("en-wikibooks-org-".length)}`;
  }

  if (id.startsWith("developer-mozilla-org-")) {
    return `mdn-${id.slice("developer-mozilla-org-".length)}`;
  }

  if (id.startsWith("docs-python-org-")) {
    return `python-${id.slice("docs-python-org-".length)}`;
  }

  if (id.startsWith("docs-docker-com-")) {
    return `docker-${id.slice("docs-docker-com-".length)}`;
  }

  if (id.startsWith("cheatsheetseries-owasp-org-")) {
    return `owasp-${id.slice("cheatsheetseries-owasp-org-".length)}`;
  }

  if (id.startsWith("martinfowler-com-")) {
    return `fowler-${id.slice("martinfowler-com-".length)}`;
  }

  if (id.startsWith("mermaid-js-org-")) {
    return `mermaid-${id.slice("mermaid-js-org-".length)}`;
  }

  if (id.startsWith("www-youtube-com-")) {
    const yt = youtubeId(url);
    if (yt) return yt;
  }

  if (id.startsWith("www-")) {
    const withoutWww = id.slice(4);
    const hostEnd = withoutWww.indexOf("-");
    if (hostEnd === -1) return withoutWww;
    const host = withoutWww.slice(0, hostEnd);
    const rest = withoutWww.slice(hostEnd + 1);
    if (rest === host || rest.endsWith(`-${host}`)) {
      return slugify(host.split("-")[0]);
    }
    if (rest.length <= 32) return slugify(`${host}-${rest}`);
    return slugify(rest);
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 40 && !id.includes("org-")) {
    return id;
  }

  const tail = pathTail(url, 2) || slugify(title);
  const domain = domainKey(url).replace(/-org$|-com$|-edu$|-io$|-net$/, "");
  return slugify(`${domain}-${tail}`).slice(0, 48);
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

function buildIdMap(entries) {
  const used = new Set();
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const entry of entries) {
    const candidate = leanId(entry);
    const nextId = ensureUnique(candidate, used);
    map.set(entry.id, nextId);
  }

  return map;
}

function replaceCitations(text, idMap) {
  return text.replace(/\[@([a-z0-9-]+)\]/g, (match, oldId) => {
    const nextId = idMap.get(oldId);
    if (!nextId) return match;
    return `[@${nextId}]`;
  });
}

function updateMarkdownDir(dir, idMap) {
  let files = 0;
  let replacements = 0;

  for (const file of readdirSync(dir).filter((name) => name.endsWith(".md"))) {
    const path = join(dir, file);
    const original = readFileSync(path, "utf8");
    const updated = replaceCitations(original, idMap);
    if (updated !== original) {
      writeFileSync(path, updated, "utf8");
      files += 1;
      replacements += (original.match(/\[@/g) ?? []).length;
    }
  }

  return { files, replacements };
}

function applyCatalog(entries, idMap) {
  return entries.map((entry) => ({
    ...entry,
    id: idMap.get(entry.id) ?? entry.id,
  }));
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const idMap = buildIdMap(catalog);

  const changes = [...idMap.entries()].filter(([oldId, newId]) => oldId !== newId);
  console.log(`Renaming ${changes.length} of ${catalog.length} resource IDs`);

  writeFileSync(CATALOG_PATH, `${JSON.stringify(applyCatalog(catalog, idMap), null, 2)}\n`, "utf8");

  const pagesResult = updateMarkdownDir(PAGES_DIR, idMap);
  console.log(`Updated ${pagesResult.files} page files`);

  if (readFileSync(FIXTURE_CATALOG, "utf8")) {
    const fixture = JSON.parse(readFileSync(FIXTURE_CATALOG, "utf8"));
    writeFileSync(FIXTURE_CATALOG, `${JSON.stringify(applyCatalog(fixture, idMap), null, 2)}\n`, "utf8");
    updateMarkdownDir(FIXTURE_PAGES, idMap);
    console.log("Updated test fixtures");
  }

  const collisions = changes.filter(([, newId], _, arr) => arr.filter(([, n]) => n === newId).length > 1);
  if (collisions.length > 0) {
    console.warn("Duplicate target IDs detected:", collisions);
    process.exitCode = 1;
  }

  console.log("Sample mappings:");
  for (const [oldId, newId] of changes.slice(0, 15)) {
    console.log(`  ${oldId} -> ${newId}`);
  }
}

main();
