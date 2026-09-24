import { DEFAULT_STORAGE_BUCKET, fetchAllPageSources } from "@pps/content";
import type { PageSource } from "@pps/core";
import { createBrowserClient } from "@pps/login/client";

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.endsWith("/") ? base : `${base}/`}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

async function fetchDevPageSources(): Promise<PageSource[]> {
  const urls = [
    "/planning/api/pages/sources",
    "/cms/api/pages/sources",
    assetUrl("api/pages/sources"),
  ];
  const seen = new Set<string>();

  for (const url of urls) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);

    try {
      const response = await fetch(url);
      if (response.ok) {
        return (await response.json()) as PageSource[];
      }
    } catch {
      // try next dev proxy
    }
  }

  throw new Error("No se pudo cargar el catálogo de páginas en dev.");
}

export async function loadGraphPageSources(): Promise<PageSource[]> {
  if (import.meta.env.DEV) {
    return fetchDevPageSources();
  }

  return fetchAllPageSources(createBrowserClient(), DEFAULT_STORAGE_BUCKET);
}
