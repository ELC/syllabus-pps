import { hasPersistedSupabaseSession } from "./sessionStorage";
import { isLoginEntryLocation, readBrowserSiteRoot } from "./siteRoot";

const AUTH_NEXT_STORAGE_KEY = "pps-auth-next";

export function saveReturnUrl(url: string = window.location.href): void {
  sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, url);
}

export function readAndClearReturnUrl(): string | null {
  const value = sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
  return value;
}

export function redirectToLoginEntry(): void {
  saveReturnUrl();
  const loginUrl = new URL(readBrowserSiteRoot(), window.location.origin);
  window.location.replace(loginUrl.href);
}

export type UnauthenticatedAccessAction = "show-login" | "redirecting";

export function redirectSubsiteToLoginIfNeeded(): boolean {
  if (isLoginEntryLocation()) {
    return false;
  }

  if (hasPersistedSupabaseSession()) {
    return false;
  }

  redirectToLoginEntry();
  return true;
}

export function handleUnauthenticatedAccess(): UnauthenticatedAccessAction {
  if (isLoginEntryLocation()) {
    return "show-login";
  }

  redirectToLoginEntry();
  return "redirecting";
}

export function maybeReturnAfterLogin(): void {
  const next = readAndClearReturnUrl();
  if (!next) {
    return;
  }

  let target: URL;
  try {
    target = new URL(next);
  } catch {
    return;
  }

  const current = new URL(window.location.href);
  if (target.origin !== current.origin || target.href === current.href) {
    return;
  }

  window.location.replace(target.href);
}
