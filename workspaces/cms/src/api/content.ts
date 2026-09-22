import type { PageSource, ResourceCatalogEntry } from "@pps/core";
import {
  DEFAULT_STORAGE_BUCKET,
  fetchAllPageSources,
  fetchResourceCatalog,
  listPagesWithTitles as listRemotePagesWithTitles,
  readPage as readRemotePage,
  writePage as writeRemotePage,
  type PageListItem,
} from "@pps/content";
import { createBrowserClient } from "@pps/login/client";

export type { PageListItem };

const useDevApi = import.meta.env.DEV;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function serverClient() {
  return createBrowserClient();
}

export async function listPages(): Promise<PageListItem[]> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/pages"));
    if (!response.ok) {
      throw new Error(`Failed to list pages (${response.status})`);
    }
    return (await response.json()) as PageListItem[];
  }

  return listRemotePagesWithTitles(serverClient(), DEFAULT_STORAGE_BUCKET);
}

export async function readPage(slug: string): Promise<string> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/page/${encodeURIComponent(slug)}`));
    if (!response.ok) {
      throw new Error(`Failed to read page (${response.status})`);
    }
    return response.text();
  }

  return readRemotePage(serverClient(), DEFAULT_STORAGE_BUCKET, slug);
}

export async function writePage(slug: string, content: string): Promise<void> {
  if (useDevApi) {
    const response = await fetch(assetUrl(`api/page/${encodeURIComponent(slug)}`), {
      method: "PUT",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: content,
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to write page (${response.status})`);
    }
    return;
  }

  await writeRemotePage(serverClient(), DEFAULT_STORAGE_BUCKET, slug, content);
}

export async function loadResources(): Promise<ResourceCatalogEntry[]> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/resources"));
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to load resources (${response.status})`);
    }
    return (await response.json()) as ResourceCatalogEntry[];
  }

  return fetchResourceCatalog(serverClient());
}

export async function loadAllPageSources(): Promise<PageSource[]> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/pages/sources"));
    if (!response.ok) {
      throw new Error(`Failed to load page sources (${response.status})`);
    }
    return (await response.json()) as PageSource[];
  }

  return fetchAllPageSources(serverClient(), DEFAULT_STORAGE_BUCKET);
}
