import {
  subscribeAnalyticsRebuildStatus,
  type AnalyticsRebuildStatus,
} from "@pps/content/browser";
import { useEffect, useState } from "react";

export function useAnalyticsRebuildStatus(): AnalyticsRebuildStatus | null {
  const [status, setStatus] = useState<AnalyticsRebuildStatus | null>(null);

  useEffect(() => {
    return subscribeAnalyticsRebuildStatus(setStatus);
  }, []);

  return status;
}
