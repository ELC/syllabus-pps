import {
  subscribeAnalyticsRebuildStatus,
  type AnalyticsRebuildStatus,
  type SubscribeAnalyticsRebuildStatusOptions,
} from "@pps/content/browser";
import { useEffect, useState } from "react";

export function useAnalyticsRebuildStatus(
  options?: SubscribeAnalyticsRebuildStatusOptions,
): AnalyticsRebuildStatus | null {
  const [status, setStatus] = useState<AnalyticsRebuildStatus | null>(null);
  const intervalMs = options?.intervalMs;
  const runningIntervalMs = options?.runningIntervalMs;
  const pollOnVisibility = options?.pollOnVisibility;

  useEffect(() => {
    return subscribeAnalyticsRebuildStatus(setStatus, {
      intervalMs,
      runningIntervalMs,
      pollOnVisibility,
    });
  }, [intervalMs, pollOnVisibility, runningIntervalMs]);

  return status;
}
