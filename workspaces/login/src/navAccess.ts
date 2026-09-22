export type ShellNavId = "home" | "analytics" | "network" | "roadmap" | "cms" | "cites" | "users";

const VIEWER_NAV_IDS = new Set<ShellNavId>(["network", "roadmap"]);

const ADMIN_ROUTE_SEGMENTS = ["", "analytics/", "cms/", "cites/", "users/"] as const;

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function relativePathFromSiteRoot(pathname: string, siteRoot: string): string {
  const current = normalizePathname(pathname);
  const root = normalizePathname(siteRoot.startsWith("/") ? siteRoot : `/${siteRoot}`);

  if (root === "/") {
    if (current === "/") {
      return "";
    }
    const body = current.slice(1);
    return body.endsWith("/") ? body : `${body}/`;
  }

  if (current === root) {
    return "";
  }

  if (!current.startsWith(`${root}/`)) {
    return current.slice(1);
  }

  const body = current.slice(root.length + 1);
  return body.endsWith("/") ? body : `${body}/`;
}

export function pathnameRequiresAdmin(pathname: string, siteRoot: string): boolean {
  const relative = relativePathFromSiteRoot(pathname, siteRoot);
  if (relative === "" || relative === "index.html") {
    return true;
  }

  const withSlash = relative.endsWith("/") ? relative : `${relative}/`;
  return ADMIN_ROUTE_SEGMENTS.some((segment) => {
    if (segment === "") {
      return false;
    }
    return withSlash === segment || withSlash.startsWith(segment);
  });
}

export function viewerLandingHref(siteRoot: string): string {
  const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  return `${root}network/`;
}

export function isNavVisibleForUser(navId: ShellNavId, isAdmin: boolean): boolean {
  if (isAdmin) {
    return true;
  }
  return VIEWER_NAV_IDS.has(navId);
}

export function applyShellNavAccess(isAdmin: boolean): void {
  const nav = document.getElementById("dashboard-site-nav");
  if (!nav) {
    return;
  }

  nav.querySelectorAll<HTMLElement>("[data-pps-nav-id]").forEach((link) => {
    const navId = link.dataset.ppsNavId as ShellNavId | undefined;
    if (!navId) {
      return;
    }
    const visible = isNavVisibleForUser(navId, isAdmin);
    link.hidden = !visible;
    link.style.display = visible ? "" : "none";
  });
}

export function enforceViewerRouteGuard(isAdmin: boolean, siteRoot?: string): void {
  if (isAdmin || typeof window === "undefined") {
    return;
  }

  const root = siteRoot ?? readSiteRootFromWindow();

  if (!pathnameRequiresAdmin(window.location.pathname, root)) {
    return;
  }

  window.location.replace(viewerLandingHref(root));
}

function readSiteRootFromWindow(): string {
  const pathname = window.location.pathname;
  const suffixes = ["analytics/", "network/", "roadmap/", "cms/", "cites/", "users/"] as const;
  for (const suffix of suffixes) {
    const index = pathname.indexOf(`/${suffix}`);
    if (index >= 0) {
      return `${pathname.slice(0, index + 1)}`;
    }
  }
  return "/";
}
