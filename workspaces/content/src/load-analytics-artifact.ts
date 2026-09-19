import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchAnalyticsArtifactBody } from "./analytics-artifacts-db";

export const ANALYTICS_ARTIFACT_FILENAMES = {
  curriculumGraph: "curriculum-graph.json",
  graphCy: "graph.cy.json",
  diagnostics: "diagnostics.json",
  dashboards: "dashboards.json",
} as const;

const FILENAME_TO_KEY: Record<string, string> = {
  [ANALYTICS_ARTIFACT_FILENAMES.curriculumGraph]: "curriculum-graph",
  [ANALYTICS_ARTIFACT_FILENAMES.graphCy]: "graph-cy",
  [ANALYTICS_ARTIFACT_FILENAMES.diagnostics]: "diagnostics",
  [ANALYTICS_ARTIFACT_FILENAMES.dashboards]: "dashboards",
};

export function readPublicSupabaseBrowserEnv(): { url: string; key: string } | null {
  const url = import.meta.env.PUBLIC_SUPABASE_PROJECT_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export function createBrowserSupabaseClient(): SupabaseClient {
  const env = readPublicSupabaseBrowserEnv();
  if (!env) {
    throw new Error(
      "Missing PUBLIC_SUPABASE_PROJECT_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY. Configure .env and run pnpm build:content after applying analytics SQL.",
    );
  }
  return createClient(env.url, env.key);
}

/** Load a compiled artifact from Supabase Postgres (`public.analytics_artifacts`). */
export async function loadAnalyticsArtifact(filename: string): Promise<unknown> {
  const artifactKey = FILENAME_TO_KEY[filename];
  if (!artifactKey) {
    throw new Error(`Unknown analytics artifact file: ${filename}`);
  }

  const client = createBrowserSupabaseClient();
  const body = await fetchAnalyticsArtifactBody(client, artifactKey);
  if (body === null) {
    throw new Error(
      `Missing analytics artifact "${artifactKey}" in Supabase. Apply content SQL 003/004 and run pnpm build:content.`,
    );
  }
  return body;
}
