#!/usr/bin/env node
/**
 * Move course frontmatter correlativas onto degree year pages (courseCorrelativas).
 * Usage: node scripts/migrate-correlativas-to-year-pages.mjs [--dry-run]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, stringifyPageSource } from "@pps/core";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pagesDir = join(repoRoot, "content/pages");
const dryRun = process.argv.includes("--dry-run");

/** Prerequisite titles per course slug and degree slug when auto filter is wrong. */
const DEGREE_PREREQ_OVERRIDES = {
  "calculo-numerico-y-simulacion": {
    lds: ["estadística i"],
    lcd: ["estadística ii", "matemática para machine learning ii"],
  },
  "optimizacion-e-investigacion-operativa": {
    lds: ["estadística i"],
    lcd: ["matemática para machine learning ii"],
  },
  "programacion-i": {
    lds: ["algoritmos y estructuras de datos"],
    lcd: [],
  },
};

function parseStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function yearDegreeSlug(slug) {
  const match = /^(.+)-ano-\d+$/i.exec(slug);
  return match?.[1]?.toLowerCase();
}

function loadPages() {
  const files = readdirSync(pagesDir).filter((name) => name.endsWith(".md"));
  return files.map((file) => {
    const path = join(pagesDir, file);
    const content = readFileSync(path, "utf8");
    const { data, content: body } = parseFrontmatter(content);
    const slug =
      typeof data.slug === "string" && data.slug.trim() ? data.slug.trim() : file.replace(/\.md$/, "");
    return { file, path, data, body, slug };
  });
}

function courseSlugsInDegree(yearPages, degreeSlug) {
  const slugs = new Set();
  for (const page of yearPages) {
    if (yearDegreeSlug(page.slug) !== degreeSlug) {
      continue;
    }
    for (const field of ["courses", "coursesNoEstructurado"]) {
      for (const entry of parseStringList(page.data[field])) {
        slugs.add(entry);
      }
    }
  }
  return slugs;
}

function main() {
  const pages = loadPages();
  const yearPages = pages.filter((page) => page.data.kind === "year");
  const coursePages = pages.filter(
    (page) => page.data.kind === "course" && parseStringList(page.data.correlativas).length > 0,
  );

  const titleBySlug = new Map();
  for (const page of pages) {
    if (page.data.kind === "course") {
      titleBySlug.set(page.slug, page.data.title ?? page.slug);
    }
  }

  const degreeSlugs = new Set(
    yearPages.map((page) => yearDegreeSlug(page.slug)).filter(Boolean),
  );

  /** @type {Map<string, Record<string, string[]>>} */
  const yearCorrelativasByPath = new Map();

  for (const coursePage of coursePages) {
    const courseSlug = coursePage.slug;
    const rawCorrelativas = parseStringList(coursePage.data.correlativas);

    for (const degreeSlug of degreeSlugs) {
      const degreeCourses = courseSlugsInDegree(yearPages, degreeSlug);
      if (!degreeCourses.has(courseSlug)) {
        continue;
      }

      let prereqs;
      const override = DEGREE_PREREQ_OVERRIDES[courseSlug]?.[degreeSlug];
      if (override !== undefined) {
        prereqs = [...override];
      } else {
        prereqs = rawCorrelativas.filter((title) => {
          for (const page of pages) {
            if (page.data.kind !== "course") {
              continue;
            }
            const titleMatch =
              (page.data.title ?? page.slug).normalize("NFC") === title.normalize("NFC");
            if (titleMatch && degreeCourses.has(page.slug)) {
              return true;
            }
          }
          return false;
        });
      }

      if (prereqs.length === 0) {
        continue;
      }

      const hostYear = yearPages.find((yearPage) => {
        if (yearDegreeSlug(yearPage.slug) !== degreeSlug) {
          return false;
        }
        const listed = [
          ...parseStringList(yearPage.data.courses),
          ...parseStringList(yearPage.data.coursesNoEstructurado),
        ];
        return listed.includes(courseSlug);
      });

      if (!hostYear) {
        continue;
      }

      const existing =
        yearCorrelativasByPath.get(hostYear.path) ??
        (typeof hostYear.data.courseCorrelativas === "object" &&
        hostYear.data.courseCorrelativas !== null &&
        !Array.isArray(hostYear.data.courseCorrelativas)
          ? { ...hostYear.data.courseCorrelativas }
          : {});

      existing[courseSlug] = prereqs;
      yearCorrelativasByPath.set(hostYear.path, existing);
    }
  }

  let updatedYears = 0;
  let strippedCourses = 0;

  for (const page of pages) {
    if (page.data.kind === "year" && yearCorrelativasByPath.has(page.path)) {
      const nextData = { ...page.data, courseCorrelativas: yearCorrelativasByPath.get(page.path) };
      const next = stringifyPageSource(nextData, page.body);
      if (next !== readFileSync(page.path, "utf8")) {
        updatedYears += 1;
        if (!dryRun) {
          writeFileSync(page.path, next);
        }
      }
    }

    if (page.data.kind === "course" && page.data.correlativas !== undefined) {
      const { correlativas: _removed, ...rest } = page.data;
      const next = stringifyPageSource(rest, page.body);
      if (next !== readFileSync(page.path, "utf8")) {
        strippedCourses += 1;
        if (!dryRun) {
          writeFileSync(page.path, next);
        }
      }
    }
  }

  process.stdout.write(
    `${dryRun ? "[dry-run] " : ""}Updated ${updatedYears} year page(s), stripped correlativas from ${strippedCourses} course page(s).\n`,
  );
}

main();
