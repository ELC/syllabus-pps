/** Open the Cites editor for a catalog entry (`/cites/?id=…`). */
export function citesEditHref(resourceId: string): string {
  const siteRoot = readBrowserSiteRoot();
  const normalizedRoot = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  const url = new URL(`${normalizedRoot}cites/`, window.location.origin);
  url.searchParams.set("id", resourceId);
  return `${url.pathname}${url.search}`;
}

/** Open Cites with a new unsaved catalog draft (`/cites/?new=1`). */
export function citesNewResourceHref(): string {
  const siteRoot = readBrowserSiteRoot();
  const normalizedRoot = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  const url = new URL(`${normalizedRoot}cites/`, window.location.origin);
  url.searchParams.delete("id");
  url.searchParams.set("new", "1");
  return `${url.pathname}${url.search}`;
}

function readBrowserSiteRoot(): string {
  const pathname = window.location.pathname;
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const suffixes = ["analytics/", "network/", "roadmap/", "planning/", "cms/", "cites/"] as const;

  for (const suffix of suffixes) {
    const index = normalized.indexOf(suffix);
    if (index >= 0) {
      const trimmed = normalized.slice(0, index);
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }

  const bare = pathname.replace(/\/$/, "") || "/";
  return bare === "/" ? "/" : `${bare}/`;
}
