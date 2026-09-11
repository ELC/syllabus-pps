import { PageSource } from "@pps/core";

export interface PageListItem {
  slug: string;
  path: string;
}

const readOnlyCms = import.meta.env.PROD;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export function isReadOnlyCms(): boolean {
  return readOnlyCms;
}

export async function listPages(): Promise<PageListItem[]> {
  const url = readOnlyCms ? assetUrl("data/pages.json") : assetUrl("api/pages");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to list pages (${response.status})`);
  }
  return (await response.json()) as PageListItem[];
}

export async function readPage(slug: string): Promise<string> {
  const url = readOnlyCms
    ? assetUrl(`data/page/${encodeURIComponent(slug)}.md`)
    : assetUrl(`api/page/${encodeURIComponent(slug)}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to read page (${response.status})`);
  }
  return response.text();
}

export async function writePage(slug: string, content: string): Promise<void> {
  if (readOnlyCms) {
    throw new Error("Saving is disabled on the hosted site. Run pnpm dev to edit content/pages locally.");
  }

  const response = await fetch(assetUrl(`api/page/${encodeURIComponent(slug)}`), {
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
