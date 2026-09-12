import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { clearPersistedSupabaseSession, hasPersistedSupabaseSession } from "./sessionStorage";

function isRefreshTokenError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) {
    return false;
  }

  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "refresh_token_not_found" ||
    message.includes("Refresh Token") ||
    message.includes("Invalid Refresh Token")
  );
}

export async function clearLocalAuthSession(client: SupabaseClient): Promise<void> {
  clearPersistedSupabaseSession();
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Storage is already cleared; ignore network errors for invalid tokens.
  }
}

/** Resolve the current session, clearing stale local auth when refresh fails. */
export async function readBrowserSession(client: SupabaseClient): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();

  if (error && isRefreshTokenError(error)) {
    await clearLocalAuthSession(client);
    return null;
  }

  if (data.session) {
    return data.session;
  }

  if (hasPersistedSupabaseSession()) {
    await clearLocalAuthSession(client);
  }

  return null;
}
