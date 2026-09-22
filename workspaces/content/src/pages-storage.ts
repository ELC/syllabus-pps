import { parseFrontmatter, slugFromPath, type PageSource } from "@pps/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { pageObjectPath } from "./constants";

export interface PageListItem {
  slug: string;
  path: string;
  /** Display title from page frontmatter (when loaded via `listPagesWithTitles`). */
  title?: string;
}

function titleFromPageMarkdown(content: string): string | undefined {
  const { data } = parseFrontmatter(content);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  return title || undefined;
}

export async function listPages(client: SupabaseClient, bucket: string): Promise<PageListItem[]> {
  const { data, error } = await client.storage.from(bucket).list("pages", { limit: 1000 });
  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((entry) => entry.name.endsWith(".md"))
    .map((entry) => ({
      slug: slugFromPath(entry.name),
      path: entry.name,
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug, "es-AR"));
}

export async function listPagesWithTitles(
  client: SupabaseClient,
  bucket: string,
): Promise<PageListItem[]> {
  const pages = await listPages(client, bucket);
  return Promise.all(
    pages.map(async (page) => {
      const content = await readPage(client, bucket, page.slug);
      return {
        ...page,
        title: titleFromPageMarkdown(content),
      };
    }),
  );
}

export async function readPage(
  client: SupabaseClient,
  bucket: string,
  slug: string,
): Promise<string> {
  const objectPath = pageObjectPath(slug);
  const downloaded = await client.storage.from(bucket).download(objectPath);
  if (downloaded.error) {
    throw downloaded.error;
  }

  return downloaded.data.text();
}

export async function writePage(
  client: SupabaseClient,
  bucket: string,
  slug: string,
  content: string,
): Promise<void> {
  const { error } = await client.storage.from(bucket).upload(pageObjectPath(slug), content, {
    upsert: true,
    contentType: "text/markdown",
  });
  if (error) {
    throw error;
  }
}

export async function fetchAllPageSources(
  client: SupabaseClient,
  bucket: string,
): Promise<PageSource[]> {
  const pages = await listPages(client, bucket);
  return Promise.all(
    pages.map(async (page) => ({
      path: page.path,
      content: await readPage(client, bucket, page.slug),
    })),
  );
}
