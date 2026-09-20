#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pagesDir = join(repoRoot, "content/pages");

const { normalizeTitle, parseFrontmatter, stringifyPageSource } = await import(
  join(repoRoot, "workspaces/core/dist/index.js")
);

const entries = await readdir(pagesDir);
const courseSlugByKey = new Map();

for (const name of entries) {
  if (!name.endsWith(".md")) {
    continue;
  }
  const fileSlug = name.replace(/\.md$/i, "");
  const source = await readFile(join(pagesDir, name), "utf8");
  const { data } = parseFrontmatter(source);
  if (data.kind !== "course") {
    continue;
  }
  const slug = typeof data.slug === "string" && data.slug.trim() ? data.slug.trim() : fileSlug;
  const title = typeof data.title === "string" ? data.title.trim() : slug;
  courseSlugByKey.set(normalizeTitle(title), slug);
  courseSlugByKey.set(normalizeTitle(slug), slug);
}

let updated = 0;
for (const name of entries) {
  if (!name.endsWith(".md")) {
    continue;
  }
  const path = join(pagesDir, name);
  const source = await readFile(path, "utf8");
  const { data, content } = parseFrontmatter(source);
  if (data.kind !== "year" || !Array.isArray(data.courses)) {
    continue;
  }

  const nextCourses = [];
  const seen = new Set();
  for (const entry of data.courses) {
    if (typeof entry !== "string") {
      continue;
    }
    const slug = courseSlugByKey.get(normalizeTitle(entry.trim())) ?? entry.trim();
    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    nextCourses.push(slug);
  }

  nextCourses.sort((left, right) => left.localeCompare(right, "es-AR"));
  const prev = data.courses;
  if (prev.length === nextCourses.length && prev.every((value, index) => value === nextCourses[index])) {
    continue;
  }

  data.courses = nextCourses;
  await writeFile(path, stringifyPageSource(data, content));
  updated += 1;
  process.stdout.write(`updated ${name}\n`);
}

process.stdout.write(`Done. ${updated} year page(s) updated.\n`);
