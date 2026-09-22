import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_STORAGE_BUCKET } from "./constants";

function readSupabaseUrlFromEnv(): string | undefined {
  return process.env.PUBLIC_SUPABASE_PROJECT_URL?.trim() || process.env.SUPABASE_URL?.trim();
}

export function readStorageBucketFromEnv(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;
}

export function assertSupabaseServerEnv(): void {
  const url = readSupabaseUrlFromEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set PUBLIC_SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY (or PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
}

export function createServerClientFromEnv(): SupabaseClient {
  assertSupabaseServerEnv();
  const url = readSupabaseUrlFromEnv()!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
