import type { SupabaseClient } from "@supabase/supabase-js";

import { ROADMAP_CONCEPT_LAYOUTS_TABLE } from "./constants";

/** RoadmapCuration-shaped JSON stored per course concept subgraph. */
export type RoadmapConceptLayoutDocument = Record<string, unknown>;

interface LayoutRow {
  degree_slug: string;
  course_slug: string;
  curation: unknown;
}

function isConceptLayoutDocument(value: unknown): value is RoadmapConceptLayoutDocument {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function fetchRoadmapConceptLayout(
  client: SupabaseClient,
  degreeSlug: string,
  courseSlug: string,
): Promise<RoadmapConceptLayoutDocument | null> {
  const { data, error } = await client
    .from(ROADMAP_CONCEPT_LAYOUTS_TABLE)
    .select("curation")
    .eq("degree_slug", degreeSlug)
    .eq("course_slug", courseSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.curation || !isConceptLayoutDocument(data.curation)) {
    return null;
  }

  return data.curation;
}

export async function upsertRoadmapConceptLayout(
  client: SupabaseClient,
  degreeSlug: string,
  courseSlug: string,
  curation: RoadmapConceptLayoutDocument,
): Promise<void> {
  const { error } = await client.from(ROADMAP_CONCEPT_LAYOUTS_TABLE).upsert(
    {
      degree_slug: degreeSlug,
      course_slug: courseSlug,
      curation,
    },
    { onConflict: "degree_slug,course_slug" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteRoadmapConceptLayout(
  client: SupabaseClient,
  degreeSlug: string,
  courseSlug: string,
): Promise<void> {
  const { error } = await client
    .from(ROADMAP_CONCEPT_LAYOUTS_TABLE)
    .delete()
    .eq("degree_slug", degreeSlug)
    .eq("course_slug", courseSlug);

  if (error) {
    throw error;
  }
}

export function isConceptLayoutRow(value: unknown): value is LayoutRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LayoutRow).degree_slug === "string" &&
    typeof (value as LayoutRow).course_slug === "string"
  );
}
