import { type ResourceCatalogEntry } from "@pps/core";
import { fetchResourceCatalog, replaceResourceCatalog } from "@pps/content";
import { createBrowserClient } from "@pps/login/client";

const useDevApi = import.meta.env.DEV;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function serverClient() {
  return createBrowserClient();
}

export async function loadResources(): Promise<ResourceCatalogEntry[]> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/resources"));
    if (!response.ok) {
      throw new Error(`Failed to load resources (${response.status})`);
    }
    return (await response.json()) as ResourceCatalogEntry[];
  }

  return fetchResourceCatalog(serverClient());
}

export async function writeResources(entries: ResourceCatalogEntry[]): Promise<void> {
  if (useDevApi) {
    const response = await fetch(assetUrl("api/resources"), {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(entries),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to write resources (${response.status})`);
    }
    return;
  }

  await replaceResourceCatalog(serverClient(), entries);
}
