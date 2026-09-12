export type NavId = "home" | "analytics" | "network" | "roadmap" | "cms";

const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/"] as const;

function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
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

export function siteRootFromEnv(appBaseUrl: string): string {
  return resolveSiteRoot(appBaseUrl);
}

