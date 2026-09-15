import { ResourceCatalog, ResourceCatalogEntry, ResourceCatalogIndex } from "./types";
import { validateResourceCatalog } from "./validate";

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function indexResourceCatalog(entries: ResourceCatalogEntry[]): ResourceCatalogIndex {
  const byId = new Map<string, ResourceCatalogEntry>();
  const byUrl = new Map<string, ResourceCatalogEntry>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
    if (entry.URL) {
      byUrl.set(canonicalizeUrl(entry.URL), entry);
    }
  }

  return { byId, byUrl };
}

export function parseResourceCatalogEntries(text: string): ResourceCatalogEntry[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Resource catalog must be a JSON array of CSL entries.");
  }

  return parsed as ResourceCatalogEntry[];
}

export function loadResourceCatalog(raw: unknown): ResourceCatalog {
  if (!Array.isArray(raw)) {
    throw new Error("Resource catalog must be a JSON array of CSL entries.");
  }

  const entries = raw as ResourceCatalogEntry[];
  validateResourceCatalog(entries);
  return { entries };
}

export function parseResourceCatalogJson(text: string): ResourceCatalog {
  return loadResourceCatalog(parseResourceCatalogEntries(text));
}
