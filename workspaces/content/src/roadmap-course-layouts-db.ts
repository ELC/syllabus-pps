import type { SupabaseClient } from "@supabase/supabase-js";

import { ROADMAP_COURSE_LAYOUTS_TABLE } from "./constants";
import { normalizeRoadmapCourseLayoutDocument } from "./roadmap-course-layout-normalize";

export interface RoadmapCourseLayoutYearTemplate {
  templateAreas: string[];
}

export type RoadmapCourseLayoutYears = Record<string, RoadmapCourseLayoutYearTemplate>;

export interface RoadmapCourseLayoutCourseEntry {
  slug: string;
}

/** Full curated grid document stored in Postgres (`years` jsonb column). */
export interface RoadmapCourseLayoutDocument {
  courses: Record<string, RoadmapCourseLayoutCourseEntry>;
  years: RoadmapCourseLayoutYears;
}

interface LayoutRow {
  degree_slug: string;
  years: unknown;
}

function isYearsMap(value: unknown): value is RoadmapCourseLayoutYears {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      Array.isArray((entry as RoadmapCourseLayoutYearTemplate).templateAreas),
  );
}

export function normalizeRoadmapCourseLayoutPayload(
  raw: unknown,
): RoadmapCourseLayoutDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  if (record.courses && record.years && isYearsMap(record.years)) {
    return normalizeRoadmapCourseLayoutDocument({
      courses: record.courses as Record<string, RoadmapCourseLayoutCourseEntry>,
      years: record.years,
    });
  }

  if (isYearsMap(raw)) {
    return normalizeRoadmapCourseLayoutDocument({
      courses: {},
      years: raw,
    });
  }

  return null;
}

export async function fetchRoadmapCourseLayout(
  client: SupabaseClient,
  degreeSlug: string,
): Promise<RoadmapCourseLayoutDocument | null> {
  const { data, error } = await client
    .from(ROADMAP_COURSE_LAYOUTS_TABLE)
    .select("years")
    .eq("degree_slug", degreeSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeRoadmapCourseLayoutPayload((data as LayoutRow).years);
}

/** @deprecated Use fetchRoadmapCourseLayout */
export async function fetchRoadmapCourseLayoutYears(
  client: SupabaseClient,
  degreeSlug: string,
): Promise<RoadmapCourseLayoutYears | null> {
  const layout = await fetchRoadmapCourseLayout(client, degreeSlug);
  return layout?.years ?? null;
}

export async function upsertRoadmapCourseLayout(
  client: SupabaseClient,
  degreeSlug: string,
  layout: RoadmapCourseLayoutDocument,
): Promise<void> {
  const normalized = normalizeRoadmapCourseLayoutDocument(layout);
  const { error } = await client.from(ROADMAP_COURSE_LAYOUTS_TABLE).upsert(
    {
      degree_slug: degreeSlug,
      years: normalized,
    },
    { onConflict: "degree_slug" },
  );

  if (error) {
    throw error;
  }
}

/** @deprecated Use upsertRoadmapCourseLayout */
export async function upsertRoadmapCourseLayoutYears(
  client: SupabaseClient,
  degreeSlug: string,
  years: RoadmapCourseLayoutYears,
): Promise<void> {
  await upsertRoadmapCourseLayout(client, degreeSlug, { courses: {}, years });
}

export async function deleteRoadmapCourseLayout(
  client: SupabaseClient,
  degreeSlug: string,
): Promise<void> {
  const { error } = await client
    .from(ROADMAP_COURSE_LAYOUTS_TABLE)
    .delete()
    .eq("degree_slug", degreeSlug);

  if (error) {
    throw error;
  }
}

/** @deprecated Use deleteRoadmapCourseLayout */
export async function deleteRoadmapCourseLayoutYears(
  client: SupabaseClient,
  degreeSlug: string,
): Promise<void> {
  await deleteRoadmapCourseLayout(client, degreeSlug);
}

export function isLayoutRow(value: unknown): value is LayoutRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LayoutRow).degree_slug === "string" &&
    typeof (value as LayoutRow).years === "object" &&
    (value as LayoutRow).years !== null
  );
}
