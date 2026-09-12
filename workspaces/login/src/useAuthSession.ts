import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { readBrowserSession } from "./authSession";
import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig, type SupabaseConfigResult } from "./config";
import { readUserDisplayName } from "./userProfile";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "misconfigured";

export interface AuthSessionState {
  status: AuthStatus;
  session: Session | null;
  displayName: string | null;
  config: SupabaseConfigResult;
  signOut: () => Promise<void>;
}

export function useAuthSession(): AuthSessionState {
  const config = readSupabaseConfig();
  const url = isMissingConfig(config) ? "" : config.url;
  const anonKey = isMissingConfig(config) ? "" : config.anonKey;
  const misconfigured = isMissingConfig(config);
  const [status, setStatus] = useState<AuthStatus>(() => (misconfigured ? "misconfigured" : "loading"));
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (misconfigured) {
      setStatus("misconfigured");
      setSession(null);
      setDisplayName(null);
      return;
    }

    const client = createBrowserClient({ url, anonKey });
    let active = true;

    async function applySession(nextSession: Session | null): Promise<void> {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
      if (!nextSession?.user) {
        setDisplayName(null);
        return;
      }

      if (active) {
        setDisplayName(readUserDisplayName(nextSession.user));
      }
    }

    void readBrowserSession(client).then((session) => {
      if (!active) {
        return;
      }
      void applySession(session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }
      void applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [url, anonKey, misconfigured]);

  async function signOut(): Promise<void> {
    if (misconfigured) {
      return;
    }
    const client = createBrowserClient({ url, anonKey });
    await client.auth.signOut();
    setSession(null);
    setStatus("unauthenticated");
  }

  return { status, session, displayName, config, signOut };
}
