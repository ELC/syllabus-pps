import { PageSource } from "@pps/core";

export interface PageListItem {
  slug: string;
  path: string;
}

export async function listPages(): Promise<PageListItem[]> {
  const response = await fetch("/api/pages");
  if (!response.ok) {
    throw new Error(`Failed to list pages (${response.status})`);
  }
  return (await response.json()) as PageListItem[];
}

export async function readPage(slug: string): Promise<string> {
  const response = await fetch(`/api/page/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Failed to read page (${response.status})`);
  }
  return response.text();
}

export async function writePage(slug: string, content: string): Promise<void> {
  const response = await fetch(`/api/page/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to write page (${response.status})`);
  }
}

export async function loadAllPageSources(): Promise<PageSource[]> {
  const pages = await listPages();
  const sources: PageSource[] = [];
  for (const page of pages) {
    sources.push({
      path: page.path,
      content: await readPage(page.slug),
    });
  }
  return sources;
}
