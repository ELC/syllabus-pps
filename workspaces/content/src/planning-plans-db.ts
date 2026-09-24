import type { SupabaseClient } from "@supabase/supabase-js";

import { PLANNING_PLANS_TABLE } from "./constants";

export const PLANNING_WEEK_COUNT = 15;

export interface PlanningWeek {
  topic: string[];
  prerequisite: string[];
  optional: string[];
}

export interface PlanningPlanDocument {
  version: 1;
  weeks: PlanningWeek[];
}

function normalizeConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean))];
}

function normalizeWeek(value: unknown): PlanningWeek {
  const week = typeof value === "object" && value !== null
    ? value as Partial<Record<keyof PlanningWeek, unknown>>
    : {};
  return {
    topic: normalizeConcepts(week.topic),
    prerequisite: normalizeConcepts(week.prerequisite),
    optional: normalizeConcepts(week.optional),
  };
}

export function emptyPlanningPlan(): PlanningPlanDocument {
  return {
    version: 1,
    weeks: Array.from({ length: PLANNING_WEEK_COUNT }, () => normalizeWeek(null)),
  };
}

export function normalizePlanningPlan(value: unknown): PlanningPlanDocument {
  const weeks =
    typeof value === "object" && value !== null && Array.isArray((value as { weeks?: unknown }).weeks)
      ? (value as { weeks: unknown[] }).weeks
      : [];
  return {
    version: 1,
    weeks: Array.from({ length: PLANNING_WEEK_COUNT }, (_, index) => normalizeWeek(weeks[index])),
  };
}

export async function fetchPlanningPlan(
  client: SupabaseClient,
  courseSlug: string,
): Promise<PlanningPlanDocument | null> {
  const { data, error } = await client
    .from(PLANNING_PLANS_TABLE)
    .select("plan")
    .eq("course_slug", courseSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.plan ? normalizePlanningPlan(data.plan) : null;
}

export async function upsertPlanningPlan(
  client: SupabaseClient,
  courseSlug: string,
  plan: PlanningPlanDocument,
): Promise<void> {
  const { error } = await client
    .from(PLANNING_PLANS_TABLE)
    .upsert(
      { course_slug: courseSlug, plan: normalizePlanningPlan(plan) },
      { onConflict: "course_slug" },
    );

  if (error) {
    throw error;
  }
}
