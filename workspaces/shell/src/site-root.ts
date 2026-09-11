export type NavId = "home" | "analytics" | "network" | "roadmap" | "cms";

const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/"] as const;

function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function resolveSiteRoot(appBaseUrl: string, publicSiteRoot?: string): string {
  if (publicSiteRoot) {
    return normalizeBase(publicSiteRoot);
  }

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
  const publicSiteRoot =
    typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_SITE_ROOT
      ? String(import.meta.env.PUBLIC_SITE_ROOT)
      : undefined;
  return resolveSiteRoot(appBaseUrl, publicSiteRoot);
}

export function shellStylesHref(appBaseUrl: string): string {
  return `${siteRootFromEnv(appBaseUrl)}assets/shell/pps-shell.css`;
}

export function shellLogoHref(appBaseUrl: string): string {
  return `${siteRootFromEnv(appBaseUrl)}assets/shell/logo-horizontal-blanco.png`;
}
