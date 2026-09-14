#!/usr/bin/env node
/**
 * Rename resource IDs: drop publisher/institution prefixes; use course names instead of MIT codes.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CATALOG_PATH = join(ROOT, "content", "resources.json");
const PAGES_DIR = join(ROOT, "content", "pages");
const FIXTURE_CATALOG = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "resources.json");
const FIXTURE_PAGES = join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "pages");
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @type {Record<string, string>} */
const MANUAL_IDS = {
  "agile-alliance-acceptance-test": "acceptance-testing",
  "apigee-api-design": "web-api-design-the-missing-link",
  "atlassian-acceptance-criteria": "writing-acceptance-criteria",
  "atlassian-ci-cd": "continuous-integration-delivery-deployment",
  "coursera-agile-essentials": "agile-essentials",
  "coursera-agile-scrum": "agile-development-and-scrum",
  "coursera-algorithms": "algorithms-specialization",
  "coursera-critical-thinking": "critical-thinking-logical-reasoning",
  "coursera-data-structures": "data-structures-specialization",
  "coursera-linear-algebra": "linear-algebra-elementary-to-advanced",
  "coursera-logic-duke": "logic-critical-thinking-duke",
  "coursera-mathematical-proofs": "mathematical-proofs",
  "coursera-mathematical-thinking": "mathematical-thinking",
  "cs50-notes-3": "asymptotic-notation",
  "docker-get-started": "get-started",
  "docker-software": "docker",
  "drawio-er-diagrams": "entity-relationship-diagrams",
  "drawio-use-case-diagrams": "uml-use-case-diagrams",
  "fowler-continuous-integration": "continuous-integration",
  "fowler-domaindrivendesign": "domain-driven-design",
  "fowler-givenwhenthen": "given-when-then",
  "fowler-richardsonmaturitymodel": "richardson-maturity-model-fowler",
  "fowler-ubiquitouslanguage": "ubiquitous-language",
  "fowler-userstory": "user-story",
  "freecodecamp-ci-cd": "learn-continuous-integration-delivery-deployment",
  "freecodecamp-docker": "introduction-to-docker-and-containers",
  "freecodecamp-oop": "four-pillars-of-object-oriented-programming",
  "gatech-matrix-equations": "matrix-equations",
  "gatech-matrix-transformations": "matrix-transformations",
  "gatech-row-reduction": "row-reduction",
  "gatech-vectors": "vectors-interactive-linear-algebra",
  "mdn-authentication": "http-authentication",
  "mdn-learn-web-development": "learn-web-development",
  "mdn-your-first-website": "your-first-website",
  "mit-18-090-intro-to-mathematical-reasoning-sprin": "intro-to-mathematical-reasoning-spring-2024",
  "mit-6-1200j-lectures": "mathematics-for-computer-science-lectures",
  "mit-6-1200j-mathematics-for-computer-science-spr": "mathematics-for-computer-science-spring-2024",
  "nng-usability-heuristics": "ten-usability-heuristics",
  "nng-usability-testing": "usability-testing-101",
  "owasp-authentication-cheat-sheet": "authentication-cheat-sheet",
  "postgresql-transactions": "transactions-tutorial",
  "postgresql-tutorial-for-beginners": "postgresql-tutorial",
  "pythoninstitute-pcep": "pcep",
  "scrumguides-scrum-guide-html": "scrum-guide",
  "umd-nsd": "namespaces-in-databases",
  "visual-paradigm-use-case": "what-is-use-case-diagram",
  "wikibooks-software-engineering": "software-engineering",
  "wikibooks-software-engineering-uml": "software-engineering-uml",
};

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
}

function titleSlug(entry) {
  let title = entry.title.trim();
  title = title.replace(/^MIT\s+\d[\d.a-z-]+\s+/i, "");
  title = title.replace(/,\s*Spring\s+\d{4}$/i, "");
  return slugify(title);
}

function leanId(entry) {
  if (MANUAL_IDS[entry.id]) {
    return MANUAL_IDS[entry.id];
  }
  return entry.id;
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

function renameCatalog(catalogPath, pagesDir) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const unchangedIds = new Set(
    catalog.filter((entry) => !MANUAL_IDS[entry.id]).map((entry) => entry.id),
  );
  const used = new Set(unchangedIds);
  /** @type {Map<string, string>} */
  const idMap = new Map();

  for (const entry of catalog) {
    const candidate = leanId(entry);
    if (candidate === entry.id) {
      continue;
    }
    if (!ID_RE.test(candidate)) {
      throw new Error(`Invalid id "${candidate}" for ${entry.id}`);
    }
    const nextId = ensureUnique(candidate, used);
    idMap.set(entry.id, nextId);
    entry.id = nextId;
  }

  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  updateMarkdownDir(pagesDir, idMap);
  return idMap;
}

const mainMap = renameCatalog(CATALOG_PATH, PAGES_DIR);
renameCatalog(FIXTURE_CATALOG, FIXTURE_PAGES);

console.log(`Renamed ${mainMap.size} resource IDs`);
for (const [oldId, newId] of mainMap) {
  console.log(`  ${oldId} -> ${newId}`);
}
