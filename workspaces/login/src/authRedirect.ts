import { hasPersistedSupabaseSession } from "./sessionStorage";
import { isLoginEntryLocation, readBrowserSiteRoot } from "./siteRoot";

const AUTH_NEXT_STORAGE_KEY = "pps-auth-next";

/** Post-sign-in landing URL; must match Supabase Auth redirect allow list (see README). */
export function signInRedirectTo(): string {
  const siteRoot = readBrowserSiteRoot();
  return new URL(siteRoot, window.location.origin).href;
}

const OAUTH_CALLBACK_PARAMS = ["error", "error_code", "error_description", "code"] as const;

const OAUTH_SIGN_IN_DENIED_MESSAGE =
  "Sign-in is not available for this account. Contact the administrator if you believe this is a mistake.";

/** Read OAuth callback errors from the URL, strip auth params, and return user-facing text. */
export function readOAuthCallbackError(): string | null {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  const errorCode = params.get("error") ?? hashParams.get("error");
  if (!errorCode) {
    return null;
  }

  for (const key of OAUTH_CALLBACK_PARAMS) {
    params.delete(key);
    hashParams.delete(key);
  }

  const cleanSearch = params.toString();
  const cleanHash = hashParams.toString();
  const cleanUrl =
    url.pathname +
    (cleanSearch ? `?${cleanSearch}` : "") +
    (cleanHash ? `#${cleanHash}` : "");
  window.history.replaceState({}, document.title, cleanUrl);

  return OAUTH_SIGN_IN_DENIED_MESSAGE;
}

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
