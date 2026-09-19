import {
  parseResourceCatalogEntries,
  type ResourceCatalogEntry,
} from "@pps/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { RESOURCES_TABLE } from "./constants";

interface ResourceRow {
  id: string;
  entry: ResourceCatalogEntry;
}

export async function fetchResourceCatalog(client: SupabaseClient): Promise<ResourceCatalogEntry[]> {
  const { data, error } = await client
    .from(RESOURCES_TABLE)
    .select("entry")
    .order("id", { ascending: true });
  if (error) {
    throw error;
  }

  return parseResourceCatalogEntries(
    JSON.stringify((data ?? []).map((row) => (row as ResourceRow).entry)),
  );
}

export async function replaceResourceCatalog(
  client: SupabaseClient,
  entries: ResourceCatalogEntry[],
): Promise<void> {
  const rows = entries.map((entry) => ({ id: entry.id, entry }));
  const nextIds = new Set(entries.map((entry) => entry.id));

  if (rows.length > 0) {
    const { error: upsertError } = await client.from(RESOURCES_TABLE).upsert(rows, { onConflict: "id" });
    if (upsertError) {
      throw upsertError;
    }
  }

  const { data: existing, error: listError } = await client.from(RESOURCES_TABLE).select("id");
  if (listError) {
    throw listError;
  }

  const staleIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !nextIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from(RESOURCES_TABLE).delete().in("id", staleIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  if (entries.length === 0 && (existing?.length ?? 0) > 0) {
    const { error: deleteAllError } = await client.from(RESOURCES_TABLE).delete().neq("id", "");
    if (deleteAllError) {
      throw deleteAllError;
    }
  }
}
