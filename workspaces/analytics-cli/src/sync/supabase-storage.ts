import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export interface RemotePageObject {
  path: string;
  content: string;
}

function readSupabaseUrlFromEnv(): string | undefined {
  return process.env.PUBLIC_SUPABASE_PROJECT_URL?.trim() || process.env.SUPABASE_URL?.trim();
}

export function createSupabaseClientFromEnv(): SupabaseClient {
  const url = readSupabaseUrlFromEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set PUBLIC_SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY (or PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Supabase realtime expects WebSocket; Node 20 needs the ws polyfill (Node 22+ has native WebSocket).
      WebSocket: WebSocket as unknown as typeof globalThis.WebSocket,
    },
  } as NonNullable<Parameters<typeof createClient>[2]>);
}

export function remoteObjectPath(slug: string): string {
  return `pages/${slug}.md`;
}

export async function listRemotePages(client: SupabaseClient, bucket: string): Promise<RemotePageObject[]> {
  const { data, error } = await client.storage.from(bucket).list("pages", { limit: 1000 });
  if (error) {
    throw error;
  }

  const pages: RemotePageObject[] = [];
  for (const entry of data ?? []) {
    if (!entry.name.endsWith(".md")) {
      continue;
    }

    const objectPath = `pages/${entry.name}`;
    const downloaded = await client.storage.from(bucket).download(objectPath);
    if (downloaded.error) {
      throw downloaded.error;
    }

    pages.push({
      path: entry.name,
      content: await downloaded.data.text(),
    });
  }

  return pages;
}

export async function uploadRemotePage(
  client: SupabaseClient,
  bucket: string,
  slug: string,
  content: string,
): Promise<void> {
  const { error } = await client.storage.from(bucket).upload(remoteObjectPath(slug), content, {
    upsert: true,
    contentType: "text/markdown",
  });
  if (error) {
    throw error;
  }
}
