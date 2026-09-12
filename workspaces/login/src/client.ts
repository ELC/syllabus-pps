import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isMissingConfig, readSupabaseConfig, type SupabasePublicConfig } from "./config";
import { purgeInvalidPersistedSessions } from "./sessionStorage";

let browserClient: SupabaseClient | null = null;

export function createBrowserClient(config?: SupabasePublicConfig): SupabaseClient {
  const resolved = config ?? readSupabaseConfig();
  if (isMissingConfig(resolved)) {
    throw new Error(resolved.message);
  }

  if (!browserClient) {
    purgeInvalidPersistedSessions();

    browserClient = createClient(resolved.url, resolved.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    browserClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        document.documentElement.classList.remove("auth-session-cached");
      }
    });
  }

  return browserClient;
}

export function resetBrowserClientForTests(): void {
  browserClient = null;
}
