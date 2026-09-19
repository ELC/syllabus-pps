import type { SupabaseClient } from "@supabase/supabase-js";

export const ANALYTICS_REBUILD_STATUS_TABLE = "analytics_rebuild_status";
export const ANALYTICS_REBUILD_STATUS_ID = 1;

export type AnalyticsRebuildState = "idle" | "running";

export interface AnalyticsRebuildStatusRow {
  state: AnalyticsRebuildState;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
  last_ok_at: string | null;
  page_count: number | null;
  resource_count: number | null;
  updated_at: string;
}

export async function fetchAnalyticsRebuildStatusRow(
  client: SupabaseClient,
): Promise<AnalyticsRebuildStatusRow | null> {
  const { data, error } = await client
    .from(ANALYTICS_REBUILD_STATUS_TABLE)
    .select(
      "state, started_at, finished_at, last_error, last_ok_at, page_count, resource_count, updated_at",
    )
    .eq("id", ANALYTICS_REBUILD_STATUS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return data as AnalyticsRebuildStatusRow;
}

/** Returns `started_at` token; finish handlers must match it to avoid clobbering a newer run. */
export async function markAnalyticsRebuildRunning(client: SupabaseClient): Promise<string> {
  const startedAt = new Date().toISOString();
  const { error } = await client.from(ANALYTICS_REBUILD_STATUS_TABLE).upsert(
    {
      id: ANALYTICS_REBUILD_STATUS_ID,
      state: "running",
      started_at: startedAt,
      finished_at: null,
      last_error: null,
      updated_at: startedAt,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return startedAt;
}

export async function markAnalyticsRebuildFinished(
  client: SupabaseClient,
  startedAt: string,
  outcome:
    | { ok: true; updatedAt: string; pageCount: number; resourceCount: number }
    | { ok: false; error: string },
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const patch =
    outcome.ok === true
      ? {
          state: "idle" as const,
          finished_at: finishedAt,
          last_error: null,
          last_ok_at: outcome.updatedAt,
          page_count: outcome.pageCount,
          resource_count: outcome.resourceCount,
          updated_at: finishedAt,
        }
      : {
          state: "idle" as const,
          finished_at: finishedAt,
          last_error: outcome.error,
          updated_at: finishedAt,
        };

  const { error } = await client
    .from(ANALYTICS_REBUILD_STATUS_TABLE)
    .update(patch)
    .eq("id", ANALYTICS_REBUILD_STATUS_ID)
    .eq("started_at", startedAt);

  if (error) {
    throw new Error(error.message);
  }
}
