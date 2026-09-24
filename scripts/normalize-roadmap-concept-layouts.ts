#!/usr/bin/env npx tsx
/**
 * Normalize public.roadmap_concept_layouts to canonical linear parallel-lane storage.
 *
 *   node --env-file=.env node_modules/.bin/tsx scripts/normalize-roadmap-concept-layouts.ts
 *   pnpm normalize:roadmap-concept-layouts -- --write --degree lds
 */
import {
  buildGraphFromPages,
  emptyLoadedConfig,
  PageKind,
  parseRoadmapCurationDocumentOrNull,
  projectCourseConceptRoadmap,
} from "@pps/core";
import {
  assertSupabaseServerEnv,
  createServerClientFromEnv,
  fetchAllPageSources,
  fetchResourceCatalog,
  readStorageBucketFromEnv,
  ROADMAP_CONCEPT_LAYOUTS_TABLE,
  upsertRoadmapConceptLayout,
} from "@pps/content";
import { openRoadmapCurationLinearNormalization } from "../workspaces/roadmap/src/components/roadmap/concept-curation-normalize.ts";

const args = process.argv.slice(2);
const write = args.includes("--write");
const degreeIndex = args.indexOf("--degree");
const degreeFilter = degreeIndex >= 0 ? args[degreeIndex + 1]?.trim() : undefined;

async function main(): Promise<void> {
  assertSupabaseServerEnv();
  const config = emptyLoadedConfig();
  const client = createServerClientFromEnv();
  const bucket = readStorageBucketFromEnv();
  const [sources, resources] = await Promise.all([
    fetchAllPageSources(client, bucket),
    fetchResourceCatalog(client),
  ]);
  const graph = buildGraphFromPages({ sources, config, resources });

  let query = client.from(ROADMAP_CONCEPT_LAYOUTS_TABLE).select("degree_slug, course_slug, curation");
  if (degreeFilter) {
    query = query.eq("degree_slug", degreeFilter);
  }

  const { data, error } = await query.order("degree_slug").order("course_slug");
  if (error) {
    throw error;
  }

  const rows = data ?? [];
  let changedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const degreeSlug = String(row.degree_slug);
    const courseSlug = String(row.course_slug);
    const raw = row.curation;
    const parsed = parseRoadmapCurationDocumentOrNull(raw);
    if (!parsed) {
      skippedCount += 1;
      console.log(`skip ${degreeSlug}/${courseSlug}: invalid curation`);
      continue;
    }

    const degreePage = graph.pages.find(
      (page) => page.slug === degreeSlug && page.kind === PageKind.Degree,
    );
    const coursePage = graph.pages.find(
      (page) => page.slug === courseSlug && page.kind === PageKind.Course,
    );
    if (!degreePage || !coursePage) {
      skippedCount += 1;
      console.log(`skip ${degreeSlug}/${courseSlug}: missing degree or course page`);
      continue;
    }

    const courseRoadmap = projectCourseConceptRoadmap(graph, degreePage.title, coursePage.title);
    if (!courseRoadmap) {
      skippedCount += 1;
      console.log(`skip ${degreeSlug}/${courseSlug}: empty concept subgraph`);
      continue;
    }

    const { curation, changed, warnings } = openRoadmapCurationLinearNormalization(
      parsed,
    ).forCourse(courseRoadmap);

    for (const warning of warnings) {
      console.log(`  ${degreeSlug}/${courseSlug}: ${warning}`);
    }

    if (!changed) {
      console.log(`ok ${degreeSlug}/${courseSlug}: already canonical`);
      continue;
    }

    changedCount += 1;
    console.log(
      `fix ${degreeSlug}/${courseSlug}: spine=[${curation.parallelLanes[0]?.spine.join(", ") ?? ""}]`,
    );

    if (write) {
      await upsertRoadmapConceptLayout(client, degreeSlug, courseSlug, curation);
    }
  }

  console.log(
    `\n${write ? "updated" : "would update"} ${changedCount} layout(s); ${skippedCount} skipped; ${rows.length} row(s) scanned.`,
  );
  if (!write && changedCount > 0) {
    console.log("Re-run with --write to persist changes.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
