interface StoredAuthPayload {
  access_token?: string;
  refresh_token?: string;
}

function isPlausibleStoredSession(parsed: StoredAuthPayload): boolean {
  const access = parsed.access_token?.trim();
  const refresh = parsed.refresh_token?.trim();

  if (access && access.split(".").length === 3) {
    return true;
  }

  if (refresh && refresh.length >= 24) {
    return true;
  }

  return false;
}

function readStoredAuthPayload(key: string): StoredAuthPayload | null {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthPayload;
  } catch {
    return null;
  }
}

/** Inline script: mark cached Supabase sessions before module JS runs (avoids auth-pending flicker). */
export const OPTIMISTIC_AUTH_BOOTSTRAP_SCRIPT = `(function(){try{function plausible(parsed){var access=parsed.access_token;var refresh=parsed.refresh_token;if(access&&access.split(".").length===3)return true;if(refresh&&refresh.length>=24)return true;return false}for(var i=0;i<localStorage.length;i+=1){var key=localStorage.key(i);if(!key||key.indexOf("sb-")!==0||key.slice(-11)!=="-auth-token")continue;var raw=localStorage.getItem(key);if(!raw)continue;var parsed=JSON.parse(raw);if(parsed&&plausible(parsed)){document.documentElement.classList.add("auth-session-cached");return}}}catch(error){}})();`;

export function clearPersistedSupabaseSession(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  }

  document.documentElement.classList.remove("auth-session-cached");
}

/** Drop corrupted auth payloads before Supabase tries to refresh them. */
export function purgeInvalidPersistedSessions(): void {
  let removed = false;

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const parsed = readStoredAuthPayload(key);
    if (!parsed || !isPlausibleStoredSession(parsed)) {
      localStorage.removeItem(key);
      removed = true;
    }
  }

  if (removed) {
    document.documentElement.classList.remove("auth-session-cached");
  }
}

export function hasPersistedSupabaseSession(): boolean {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const parsed = readStoredAuthPayload(key);
    if (parsed && isPlausibleStoredSession(parsed)) {
      return true;
    }
  }

  return false;
}
