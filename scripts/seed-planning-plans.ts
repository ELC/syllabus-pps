#!/usr/bin/env npx tsx
/**
 * Best-effort fifteen-week planning plans from course-linked concepts.
 *
 *   node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/seed-planning-plans.ts
 *   node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/seed-planning-plans.ts --write
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGraphFromPages,
  emptyLoadedConfig,
  normalizeTitle,
  PageKind,
  parseYearSlug,
  type ZettelPage,
} from "@pps/core";
import {
  assertSupabaseServerEnv,
  createServerClientFromEnv,
  fetchAllPageSources,
  fetchPlanningPlan,
  fetchResourceCatalog,
  normalizePlanningPlan,
  PLANNING_WEEK_COUNT,
  readStorageBucketFromEnv,
  upsertPlanningPlan,
  type PlanningPlanDocument,
  type PlanningWeek,
} from "@pps/content";
import { readPageSources } from "../workspaces/analytics-cli/src/content/read-pages.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const skipExisting = !args.includes("--overwrite");

function conceptSlugsInPageOrder(
  page: ZettelPage,
  conceptTitles: ReadonlySet<string>,
  conceptSlugByTitle: ReadonlyMap<string, string>,
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const considerTitle = (rawTitle: string): void => {
    const normalized = normalizeTitle(rawTitle);
    if (!conceptTitles.has(normalized)) {
      return;
    }
    const slug = conceptSlugByTitle.get(normalized);
    if (!slug || seen.has(slug)) {
      return;
    }
    seen.add(slug);
    ordered.push(slug);
  };

  for (const block of page.blocks) {
    for (const tag of block.tags) {
      considerTitle(tag.resolvedTarget ?? tag.target);
    }
    for (const ref of block.refs) {
      considerTitle(ref.resolvedTarget ?? ref.target);
    }
  }

  return ordered;
}

function weekCountsForConcepts(conceptCount: number, totalWeeks = PLANNING_WEEK_COUNT): number[] {
  if (conceptCount <= 0) {
    return [];
  }
  const base = Math.floor(totalWeeks / conceptCount);
  const extra = totalWeeks % conceptCount;
  return Array.from({ length: conceptCount }, (_, index) => base + (index < extra ? 1 : 0));
}

function buildPlanFromConceptSlugs(concepts: readonly string[]): PlanningPlanDocument {
  const counts = weekCountsForConcepts(concepts.length);
  const weeks: PlanningWeek[] = Array.from({ length: PLANNING_WEEK_COUNT }, () => ({
    topic: [],
    prerequisite: [],
  }));

  let weekIndex = 0;
  for (let conceptIndex = 0; conceptIndex < concepts.length; conceptIndex += 1) {
    const concept = concepts[conceptIndex]!;
    const previous = conceptIndex > 0 ? concepts[conceptIndex - 1]! : null;
    const next = conceptIndex < concepts.length - 1 ? concepts[conceptIndex + 1]! : null;
    const span = counts[conceptIndex] ?? 0;

    for (let offset = 0; offset < span; offset += 1) {
      const isLastInSpan = offset === span - 1;
      const topic = [concept];
      if (isLastInSpan && next) {
        topic.push(next);
      }

      const prerequisite = previous ? [previous] : [];

      weeks[weekIndex] = { topic, prerequisite };
      weekIndex += 1;
    }
  }

  return normalizePlanningPlan({ version: 1, weeks });
}

function planHasTopics(plan: PlanningPlanDocument): boolean {
  return plan.weeks.some((week) => week.topic.length > 0);
}

function courseSlugsInYearFour(pages: readonly ZettelPage[]): Set<string> {
  const slugs = new Set<string>();
  for (const page of pages) {
    if (page.kind !== PageKind.Year) {
      continue;
    }
    const parsed = parseYearSlug(page.slug);
    if (!parsed || parsed.yearIndex !== 4) {
      continue;
    }
    for (const entry of [...(page.courses ?? []), ...(page.coursesNoEstructurado ?? [])]) {
      const ref = (entry.resolvedTarget ?? entry.target).trim();
      if (ref) {
        slugs.add(ref);
      }
    }
  }
  return slugs;
}

async function main(): Promise<void> {
  assertSupabaseServerEnv();
  const config = emptyLoadedConfig();
  const client = createServerClientFromEnv();
  const bucket = readStorageBucketFromEnv();

  const useLocal = args.includes("--local");
  const sources = useLocal
    ? readPageSources(resolve(repoRoot, "content/pages"))
    : await fetchAllPageSources(client, bucket);
  const resources = useLocal
    ? undefined
    : await fetchResourceCatalog(client);

  const graph = buildGraphFromPages({ sources, config, resources });
  const conceptPages = graph.pages.filter((page) => page.kind === PageKind.Concept);
  const conceptTitles = new Set(conceptPages.map((page) => page.normalizedTitle));
  const conceptSlugByTitle = new Map(
    conceptPages.map((page) => [page.normalizedTitle, page.slug] as const),
  );
  const yearFourSlugs = courseSlugsInYearFour(graph.pages);

  const coursePages = graph.pages.filter((page) => page.kind === PageKind.Course);
  let upserted = 0;
  let skipped = 0;

  for (const course of coursePages) {
    if (yearFourSlugs.has(course.slug)) {
      skipped += 1;
      console.log(`skip ${course.slug}: año 4`);
      continue;
    }

    const concepts = conceptSlugsInPageOrder(course, conceptTitles, conceptSlugByTitle);
    if (concepts.length === 0) {
      skipped += 1;
      console.log(`skip ${course.slug}: sin conceptos`);
      continue;
    }

    if (skipExisting) {
      const existing = await fetchPlanningPlan(client, course.slug);
      if (existing && planHasTopics(existing)) {
        skipped += 1;
        console.log(`skip ${course.slug}: plan existente`);
        continue;
      }
    }

    const plan = buildPlanFromConceptSlugs(concepts);
    console.log(
      `${write ? "upsert" : "draft"} ${course.slug}: [${concepts.join(", ")}] → ${concepts.length} conceptos / 15 semanas`,
    );

    if (write) {
      await upsertPlanningPlan(client, course.slug, plan);
      upserted += 1;
    }
  }

  console.log(
    `\n${write ? "Upserted" : "Would upsert"} ${upserted} plan(s); ${skipped} skipped; ${coursePages.length} course page(s) scanned.`,
  );
  if (!write) {
    console.log("Re-run with --write to persist to Supabase.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
