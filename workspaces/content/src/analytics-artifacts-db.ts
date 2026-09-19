import type { SupabaseClient } from "@supabase/supabase-js";

export const ANALYTICS_ARTIFACTS_TABLE = "analytics_artifacts";

export async function fetchAnalyticsArtifactBody(
  client: SupabaseClient,
  key: string,
): Promise<unknown | null> {
  const { data, error } = await client
    .from(ANALYTICS_ARTIFACTS_TABLE)
    .select("body")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.body ?? null;
}

export async function replaceAnalyticsArtifacts(
  client: SupabaseClient,
  records: Record<string, unknown>,
): Promise<void> {
  const rows = Object.entries(records).map(([key, body]) => ({
    key,
    body,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client.from(ANALYTICS_ARTIFACTS_TABLE).upsert(rows, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }
}
