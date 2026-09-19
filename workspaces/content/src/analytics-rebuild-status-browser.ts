import { fetchAnalyticsRebuildStatusRow, type AnalyticsRebuildState } from "./analytics-rebuild-status-db";
import { createBrowserSupabaseClient, readPublicSupabaseBrowserEnv } from "./load-analytics-artifact";

export interface AnalyticsRebuildStatus {
  state: AnalyticsRebuildState;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  lastOkAt: string | null;
  pageCount: number | null;
  resourceCount: number | null;
  updatedAt: string;
}

export type AnalyticsRebuildIndicatorPhase = "updated" | "updating" | "unknown";

export function analyticsRebuildIndicatorPhase(
  status: AnalyticsRebuildStatus | null,
): AnalyticsRebuildIndicatorPhase {
  if (!status) {
    return "unknown";
  }
  if (status.state === "running") {
    return "updating";
  }
  if (status.state === "idle") {
    if (status.lastError) {
      return "unknown";
    }
    if (status.lastOkAt) {
      return "updated";
    }
  }
  return "unknown";
}

function mapRow(row: NonNullable<Awaited<ReturnType<typeof fetchAnalyticsRebuildStatusRow>>>): AnalyticsRebuildStatus {
  return {
    state: row.state,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    lastError: row.last_error,
    lastOkAt: row.last_ok_at,
    pageCount: row.page_count,
    resourceCount: row.resource_count,
    updatedAt: row.updated_at,
  };
}

export async function fetchAnalyticsRebuildStatus(): Promise<AnalyticsRebuildStatus | null> {
  if (!readPublicSupabaseBrowserEnv()) {
    return null;
  }

  try {
    const client = createBrowserSupabaseClient();
    const row = await fetchAnalyticsRebuildStatusRow(client);
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

export interface SubscribeAnalyticsRebuildStatusOptions {
  intervalMs?: number;
  runningIntervalMs?: number;
  /** After `notifyAnalyticsRebuildTriggered`, show “running” until Postgres catches up or this elapses. */
  optimisticWindowMs?: number;
}

const REBUILD_TRIGGER_LISTENERS = new Set<() => void>();

/** Call when a rebuild is requested (e.g. CMS/Cites save) so UIs flip to “Actualizando…” immediately. */
export function notifyAnalyticsRebuildTriggered(): void {
  for (const listener of REBUILD_TRIGGER_LISTENERS) {
    listener();
  }
}

function optimisticRunningStatus(base: AnalyticsRebuildStatus | null): AnalyticsRebuildStatus {
  const now = new Date().toISOString();
  return {
    state: "running",
    startedAt: now,
    finishedAt: null,
    lastError: null,
    lastOkAt: base?.lastOkAt ?? null,
    pageCount: base?.pageCount ?? null,
    resourceCount: base?.resourceCount ?? null,
    updatedAt: now,
  };
}

function withOptimisticRunning(
  status: AnalyticsRebuildStatus | null,
  optimisticUntilMs: number,
): AnalyticsRebuildStatus | null {
  if (status?.state === "running") {
    return status;
  }
  if (Date.now() >= optimisticUntilMs) {
    return status;
  }
  return optimisticRunningStatus(status);
}

/**
 * Polls `public.analytics_rebuild_status` for CMS/Cites/Roadmap “Actualizando…” labels.
 * Returns an unsubscribe function.
 */
export function subscribeAnalyticsRebuildStatus(
  listener: (status: AnalyticsRebuildStatus | null) => void,
  options: SubscribeAnalyticsRebuildStatusOptions = {},
): () => void {
  const idleIntervalMs = options.intervalMs ?? 5000;
  const runningIntervalMs = options.runningIntervalMs ?? 1500;
  const optimisticWindowMs = options.optimisticWindowMs ?? 45_000;

  if (!readPublicSupabaseBrowserEnv()) {
    listener(null);
    return () => undefined;
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let optimisticUntilMs = 0;
  let lastStatus: AnalyticsRebuildStatus | null = null;

  const publish = (status: AnalyticsRebuildStatus | null) => {
    lastStatus = status;
    listener(withOptimisticRunning(status, optimisticUntilMs));
  };

  const schedule = (status: AnalyticsRebuildStatus | null) => {
    if (cancelled) {
      return;
    }
    const effective = withOptimisticRunning(status, optimisticUntilMs);
    const delay = effective?.state === "running" ? runningIntervalMs : idleIntervalMs;
    timer = setTimeout(() => {
      void poll();
    }, delay);
  };

  const poll = async () => {
    const status = await fetchAnalyticsRebuildStatus();
    if (cancelled) {
      return;
    }
    if (status?.state === "running") {
      optimisticUntilMs = 0;
    }
    publish(status);
    schedule(status);
  };

  const onTriggered = () => {
    if (cancelled) {
      return;
    }
    optimisticUntilMs = Date.now() + optimisticWindowMs;
    publish(lastStatus);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    void poll();
  };

  REBUILD_TRIGGER_LISTENERS.add(onTriggered);

  void poll();

  return () => {
    cancelled = true;
    REBUILD_TRIGGER_LISTENERS.delete(onTriggered);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  };
}
