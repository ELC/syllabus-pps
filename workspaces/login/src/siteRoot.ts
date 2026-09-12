const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/"] as const;

function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

export function resolveSiteRoot(appBaseUrl: string): string {
  const base = normalizeBase(appBaseUrl);
  for (const suffix of APP_SUFFIXES) {
    if (base.endsWith(suffix)) {
      const trimmed = base.slice(0, -suffix.length);
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }

  return base;
}

export function readSiteRootFromLocation(pathname: string = window.location.pathname): string {
  const normalized = normalizeBase(pathname);
  for (const suffix of APP_SUFFIXES) {
    const index = normalized.indexOf(suffix);
    if (index >= 0) {
      const trimmed = normalized.slice(0, index);
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }

  const bare = normalizePathname(pathname);
  return bare === "/" ? "/" : `${bare}/`;
}

export function readBrowserSiteRoot(): string {
  if (typeof window !== "undefined") {
    return readSiteRootFromLocation();
  }

  const base = import.meta.env.BASE_URL ?? "/";
  return resolveSiteRoot(base);
}

export function isLoginEntryLocation(siteRoot: string = readBrowserSiteRoot()): boolean {
  const rootUrl = new URL(siteRoot, window.location.origin);
  const current = new URL(window.location.href);

  if (current.origin !== rootUrl.origin) {
    return false;
  }

  return normalizePathname(current.pathname) === normalizePathname(rootUrl.pathname);
}
