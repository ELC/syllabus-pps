import type { RoadmapConceptLayoutDocument } from "@pps/core";
import { parseRoadmapCurationDocumentOrNull } from "@pps/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ROADMAP_CONCEPT_LAYOUTS_TABLE } from "./constants";

export type { RoadmapConceptLayoutDocument } from "@pps/core";

interface LayoutRow {
  degree_slug: string;
  course_slug: string;
  curation: unknown;
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

  if (!data?.curation) {
    return null;
  }

  return parseRoadmapCurationDocumentOrNull(data.curation);
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
