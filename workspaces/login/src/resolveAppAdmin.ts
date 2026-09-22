import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchIsAppAdmin } from "./appAdminApi";
import { isAuthDisabled } from "./authDisabled";
import { applyShellNavAccess, enforceViewerRouteGuard } from "./navAccess";
import { readBrowserSiteRoot } from "./siteRoot";

let cachedAdmin: { userId: string; isAdmin: boolean } | null = null;
let inflightAdmin: { userId: string; promise: Promise<boolean> } | null = null;

export function resetAppAdminCache(): void {
  cachedAdmin = null;
  inflightAdmin = null;
}

export function hasCachedAppAdminForUser(userId: string): boolean {
  return cachedAdmin?.userId === userId;
}

export function readCachedAppAdminForUser(userId: string): boolean | undefined {
  if (cachedAdmin?.userId !== userId) {
    return undefined;
  }
  return cachedAdmin.isAdmin;
}

export function markAppAdminAccessPending(): void {
  document.documentElement.classList.add("pps-shell-access-pending");
  document.documentElement.classList.remove("pps-role-admin", "pps-role-viewer");
}

export function markAppAdminRole(isAdmin: boolean): void {
  document.documentElement.classList.remove("pps-shell-access-pending");
  document.documentElement.classList.toggle("pps-role-admin", isAdmin);
  document.documentElement.classList.toggle("pps-role-viewer", !isAdmin);
}

export async function resolveAppAdminForSession(client: SupabaseClient): Promise<boolean> {
  if (isAuthDisabled()) {
    return true;
  }
  return fetchIsAppAdmin(client);
}

async function resolveAppAdminForUser(client: SupabaseClient, userId: string): Promise<boolean> {
  const cached = readCachedAppAdminForUser(userId);
  if (cached !== undefined) {
    return cached;
  }

  if (inflightAdmin?.userId === userId) {
    return inflightAdmin.promise;
  }

  markAppAdminAccessPending();
  const promise = resolveAppAdminForSession(client).then((isAdmin) => {
    cachedAdmin = { userId, isAdmin };
    if (inflightAdmin?.userId === userId) {
      inflightAdmin = null;
    }
    return isAdmin;
  });

  inflightAdmin = { userId, promise };
  return promise;
}

export async function applyAppAdminShellAccess(
  client: SupabaseClient,
  siteRoot?: string,
): Promise<boolean> {
  if (isAuthDisabled()) {
    const root = siteRoot ?? readBrowserSiteRoot();
    enforceViewerRouteGuard(true, root);
    applyShellNavAccess(true);
    markAppAdminRole(true);
    return true;
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    resetAppAdminCache();
    markAppAdminRole(false);
    applyShellNavAccess(false);
    return false;
  }

  const isAdmin = await resolveAppAdminForUser(client, userId);
  const root = siteRoot ?? readBrowserSiteRoot();
  enforceViewerRouteGuard(isAdmin, root);
  applyShellNavAccess(isAdmin);
  markAppAdminRole(isAdmin);
  return isAdmin;
}

export function applyDevAdminShellAccess(siteRoot?: string): void {
  const root = siteRoot ?? readBrowserSiteRoot();
  enforceViewerRouteGuard(true, root);
  applyShellNavAccess(true);
  markAppAdminRole(true);
}
