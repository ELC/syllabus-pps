import {
  parseResourceCatalogEntries,
  serializeResourceCatalogJson,
  type ResourceCatalogEntry,
} from "@pps/core";

const readOnlyCites = import.meta.env.PROD;

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export function isReadOnlyCites(): boolean {
  return readOnlyCites;
}

export async function loadResources(): Promise<ResourceCatalogEntry[]> {
  const url = readOnlyCites ? assetUrl("data/resources.json") : assetUrl("api/resources");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load resources (${response.status})`);
  }
  return parseResourceCatalogEntries(await response.text());
}

export async function writeResources(entries: ResourceCatalogEntry[]): Promise<void> {
  if (readOnlyCites) {
    throw new Error(
      "Saving is disabled on the hosted site. Run pnpm dev to edit content/resources.json locally.",
    );
  }

  const response = await fetch(assetUrl("api/resources"), {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: serializeResourceCatalogJson(entries),
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to write resources (${response.status})`);
  }
}
