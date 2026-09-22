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

export const ANALYTICS_REBUILD_INDICATOR_LABELS = {
  updated: "Actualizado",
  updating: "Actualizando...",
  unknown: "Estado desconocido",
} as const;

/** `YYYY.MM.DD a las HH:MM` in local time, zero-padded. */
export function formatPpsLocalDateTime(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} a las ${hour}:${minute}`;
}

export function formatAnalyticsUpdatedIndicatorLabel(lastOkAtIso: string): string {
  const stamp = formatPpsLocalDateTime(lastOkAtIso);
  if (!stamp) {
    return ANALYTICS_REBUILD_INDICATOR_LABELS.updated;
  }
  return `Actualizado al ${stamp}`;
}

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
    if (status.lastOkAt) {
      return "updated";
    }
    return "unknown";
  }
  return "unknown";
}

function trimIndicatorError(message: string, maxLength = 120): string {
  if (message.length <= maxLength) {
    return message;
  }
  return `${message.slice(0, maxLength - 1)}…`;
}

export function analyticsRebuildIndicatorLabel(
  status: AnalyticsRebuildStatus | null,
  phase: AnalyticsRebuildIndicatorPhase,
): string {
  if (phase === "updated") {
    const lastOkAt = status?.lastOkAt;
    if (lastOkAt) {
      return formatAnalyticsUpdatedIndicatorLabel(lastOkAt);
    }
    return ANALYTICS_REBUILD_INDICATOR_LABELS.updated;
  }
  if (phase === "updating") {
    return ANALYTICS_REBUILD_INDICATOR_LABELS.updating;
  }

  const error = status?.lastError?.trim();
  if (error) {
    return trimIndicatorError(error);
  }
  if (status?.state === "idle" && !status.lastOkAt) {
    return "Analítica pendiente";
  }
  if (!status) {
    return "Comprobando estado…";
  }
  return ANALYTICS_REBUILD_INDICATOR_LABELS.unknown;
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
  /** When true, refetch immediately when the tab becomes visible again. */
  pollOnVisibility?: boolean;
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
  /** Do not mask a finished rebuild; optimism is only for the gap before Postgres shows `running`. */
  if (status?.state === "idle") {
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
    if (status?.state === "running" || status?.state === "idle") {
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

  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    void poll();
  };

  if (options.pollOnVisibility) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  void poll();

  return () => {
    cancelled = true;
    REBUILD_TRIGGER_LISTENERS.delete(onTriggered);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  };
}
