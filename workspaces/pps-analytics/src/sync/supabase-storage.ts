import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface RemotePageObject {
  path: string;
  content: string;
}

export function createSupabaseClientFromEnv(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).");
  }

  return createClient(url, key);
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
