import { createClient } from "@supabase/supabase-js";

import { notifyAnalyticsRebuildTriggered } from "./analytics-rebuild-status-browser";

/**
 * Fire-and-forget analytics rebuild after CMS/Cites saves (last write wins).
 */
export function triggerAnalyticsRebuild(_appBaseUrl: string): void {
  notifyAnalyticsRebuildTriggered();

  if (import.meta.env.DEV) {
    const rebuildUrl = new URL("/api/rebuild-analytics", window.location.origin);
    void fetch(rebuildUrl, { method: "POST" }).catch((error: unknown) => {
      console.warn("[pps] analytics rebuild request failed", error);
    });
    return;
  }

  const url = import.meta.env.PUBLIC_SUPABASE_PROJECT_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return;
  }

  const client = createClient(url, key);
  void client.functions.invoke("rebuild-analytics").catch(() => undefined);
}
