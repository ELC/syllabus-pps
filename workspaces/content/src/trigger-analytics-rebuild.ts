import { createClient } from "@supabase/supabase-js";

import { notifyAnalyticsRebuildTriggered } from "./analytics-rebuild-status-browser";

/**
 * Fire-and-forget analytics rebuild after CMS/Cites saves (last write wins).
 */
export function triggerAnalyticsRebuild(_appBaseUrl: string): void {
  notifyAnalyticsRebuildTriggered();

  const url = import.meta.env.PUBLIC_SUPABASE_PROJECT_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  void (async () => {
    const headers: Record<string, string> = {};
    if (url && key) {
      const authClient = createClient(url, key);
      const { data } = await authClient.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (import.meta.env.DEV) {
      const rebuildUrl = new URL("/api/rebuild-analytics", window.location.origin);
      const response = await fetch(rebuildUrl, { method: "POST", headers });
      if (response.ok) {
        return;
      }
      const detail = (await response.text()).trim();
      console.warn(
        "[pps] analytics rebuild request failed",
        response.status,
        detail || response.statusText,
      );
      return;
    }

    if (!url || !key) {
      return;
    }

    const client = createClient(url, key, {
      global: headers.Authorization ? { headers: { Authorization: headers.Authorization } } : undefined,
    });
    void client.functions.invoke("rebuild-analytics").catch(() => undefined);
  })();
}
