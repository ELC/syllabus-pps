import {
  fetchAllPageSources,
  fetchResourceCatalog,
  markAnalyticsRebuildFinished,
  markAnalyticsRebuildRunning,
  readStorageBucketFromEnv,
  replaceAnalyticsArtifacts,
  replaceDacAnalyticsData,
} from "@pps/content";
import { buildGraphFromPages } from "@pps/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildDacSyncPayload } from "../dac/sync-dac-data";
import { getDefaultLoadedConfig } from "../default-config";
import { collectDiagnostics } from "../diagnostics";
import { buildArtifactRecords } from "./artifact-records";

export async function rebuildAnalyticsInSupabase(client: SupabaseClient): Promise<{
  updatedAt: string;
  pageCount: number;
  resourceCount: number;
}> {
  const runStartedAt = await markAnalyticsRebuildRunning(client);

  try {
    const bucket = readStorageBucketFromEnv();
    const config = getDefaultLoadedConfig();
    const generatedAt = new Date().toISOString();

    const [sources, resources] = await Promise.all([
      fetchAllPageSources(client, bucket),
      fetchResourceCatalog(client),
    ]);

    const graph = buildGraphFromPages({
      sources,
      config,
      generatedAt,
      resources,
    });
    const diagnostics = collectDiagnostics(graph);
    const records = buildArtifactRecords(graph, diagnostics);

    await replaceAnalyticsArtifacts(client, records);
    await replaceDacAnalyticsData(client, buildDacSyncPayload(graph, diagnostics));

    const result = {
      updatedAt: generatedAt,
      pageCount: sources.length,
      resourceCount: resources.length,
    };

    await markAnalyticsRebuildFinished(client, runStartedAt, { ok: true, ...result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markAnalyticsRebuildFinished(client, runStartedAt, { ok: false, error: message }).catch(
      () => undefined,
    );
    throw error;
  }
}
