import { formatPpsLocalDateTime, type AnalyticsRebuildStatus } from "@pps/content/browser";

import type { PageListItem } from "@pps/content";

export type CmsSaveBlockReason = "diagnostics" | "loading" | "rebuild" | "stale" | null;

/** Keep the sidebar skeleton until every page has a display title (never flash slugs). */
export function isCmsSidebarNavReady(input: {
  loadingPages: boolean;
  pages: PageListItem[];
  sourcesLoading: boolean;
  allSourcesLoaded: boolean;
}): boolean {
  if (input.loadingPages) {
    return false;
  }
  if (input.pages.length === 0) {
    return true;
  }
  const listTitlesComplete = input.pages.every((page) => Boolean(page.title?.trim()));
  if (listTitlesComplete) {
    return true;
  }
  return input.allSourcesLoaded && !input.sourcesLoading;
}

export const CMS_CATALOG_STALE_MESSAGE =
  "Este contenido no está actualizado. Recargá la página para continuar.";

export const CMS_SAVE_SUCCESS_INDICATOR_LABEL = "Guardado en la nube exitosamente";

export function formatCmsCloudSaveIndicatorLabel(savedAtIso: string): string {
  const stamp = formatPpsLocalDateTime(savedAtIso);
  if (!stamp) {
    return CMS_SAVE_SUCCESS_INDICATOR_LABEL;
  }
  return `${CMS_SAVE_SUCCESS_INDICATOR_LABEL} ${stamp}`;
}

export const CMS_HEADER_SAVING_PAGE_LABEL = "Guardando…";

export const CMS_HEADER_LOADING_CATALOG_LABEL = "Cargando el catálogo…";

export const CMS_HEADER_UPDATING_ANALYTICS_LABEL = "Actualizando analítica…";

export const CMS_HEADER_SYNC_CHECK_LABEL = "Comprobando sincronización…";

export type CmsHeaderIndicatorPhase = "updated" | "updating" | "unknown";

export type CmsHeaderIndicatorOverride = {
  phase: CmsHeaderIndicatorPhase;
  label: string;
};

/** Faster idle polling so cross-tab saves surface stale catalog sooner (default is 5s). */
export const CMS_REBUILD_STATUS_POLL = {
  intervalMs: 1500,
  runningIntervalMs: 750,
  pollOnVisibility: true,
} as const satisfies {
  intervalMs: number;
  runningIntervalMs: number;
  pollOnVisibility: boolean;
};

export function isAnalyticsRebuildRunning(status: AnalyticsRebuildStatus | null): boolean {
  return status?.state === "running";
}

/** Block save while this tab waits for its post-save rebuild, or while any rebuild is running. */
export function isCmsRebuildSaveBlocked(
  status: AnalyticsRebuildStatus | null,
  awaitingOwnRebuild: boolean,
): boolean {
  if (awaitingOwnRebuild) {
    return true;
  }
  return status?.state === "running";
}

/**
 * True when the rebuild triggered by this tab's save has finished (do not treat pre-save `idle` as done).
 */
export function isOwnAnalyticsRebuildComplete(
  status: AnalyticsRebuildStatus | null,
  baselineLastOkAt: string | null,
  sawRunning: boolean,
): boolean {
  if (!status || status.state !== "idle") {
    return false;
  }
  if (sawRunning) {
    return true;
  }
  const lastOkAt = status.lastOkAt;
  if (!lastOkAt) {
    return false;
  }
  if (!baselineLastOkAt) {
    return true;
  }
  return lastOkAt > baselineLastOkAt;
}

/**
 * True when another tab/session started a rebuild while this tab still holds an older catalog snapshot.
 * Prefer stale (refresh) over “Actualizando analítica…” for passive tabs.
 */
export function shouldMarkCatalogStaleFromExternalRebuild(input: {
  rebuildStatus: AnalyticsRebuildStatus | null;
  awaitingOwnRebuild: boolean;
  savingPage: boolean;
  catalogReady: boolean;
  catalogSyncAcknowledged: boolean;
}): boolean {
  if (
    input.awaitingOwnRebuild ||
    input.savingPage ||
    !input.catalogReady ||
    !input.catalogSyncAcknowledged
  ) {
    return false;
  }
  return input.rebuildStatus?.state === "running";
}

/** True when another session finished a rebuild since we last acknowledged `lastOkAt`. */
export function shouldMarkCatalogStale(
  lastOkAt: string | null | undefined,
  acknowledgedLastOkAt: string | null,
  awaitingOwnRebuild: boolean,
  catalogAcknowledged: boolean,
): boolean {
  if (!catalogAcknowledged || awaitingOwnRebuild || !lastOkAt || !acknowledgedLastOkAt) {
    return false;
  }
  return lastOkAt > acknowledgedLastOkAt;
}

export function resolveCmsSaveBlockReason(input: {
  catalogStale: boolean;
  sourcesLoading: boolean;
  rebuildStatus: AnalyticsRebuildStatus | null;
  awaitingOwnRebuild: boolean;
  hasBlockingDiagnostics: boolean;
}): CmsSaveBlockReason {
  if (input.catalogStale) {
    return "stale";
  }
  if (input.sourcesLoading) {
    return "loading";
  }
  if (isCmsRebuildSaveBlocked(input.rebuildStatus, input.awaitingOwnRebuild)) {
    return "rebuild";
  }
  if (input.hasBlockingDiagnostics) {
    return "diagnostics";
  }
  return null;
}

export function cmsSaveBlockMessage(reason: CmsSaveBlockReason): string | null {
  switch (reason) {
    case "stale":
      return CMS_CATALOG_STALE_MESSAGE;
    case "loading":
      return null;
    case "rebuild":
      return null;
    case "diagnostics":
      return "Corregí los errores de esta página antes de guardar (las advertencias no bloquean).";
    default:
      return null;
  }
}

/** Single header semaphore: stale (red) → busy (yellow) → post-save success (green). */
export function resolveCmsHeaderIndicatorOverride(input: {
  catalogStale: boolean;
  /** True from save click until Storage writes finish. */
  savingPage: boolean;
  /** ISO timestamp of the last successful save in this tab; shown until the next save or stale. */
  cloudSaveIndicatorAt: string | null;
  saveBlockReason: CmsSaveBlockReason;
  awaitingOwnRebuild: boolean;
  catalogReady: boolean;
  catalogSyncAcknowledged: boolean;
}): CmsHeaderIndicatorOverride | null {
  if (input.catalogStale) {
    return { phase: "unknown", label: CMS_CATALOG_STALE_MESSAGE };
  }
  if (input.savingPage) {
    return { phase: "updating", label: CMS_HEADER_SAVING_PAGE_LABEL };
  }
  if (input.saveBlockReason === "loading") {
    return { phase: "updating", label: CMS_HEADER_LOADING_CATALOG_LABEL };
  }
  if (input.awaitingOwnRebuild || input.saveBlockReason === "rebuild") {
    return { phase: "updating", label: CMS_HEADER_UPDATING_ANALYTICS_LABEL };
  }
  if (input.catalogReady && !input.catalogSyncAcknowledged) {
    return { phase: "updating", label: CMS_HEADER_SYNC_CHECK_LABEL };
  }
  if (input.cloudSaveIndicatorAt) {
    return {
      phase: "updated",
      label: formatCmsCloudSaveIndicatorLabel(input.cloudSaveIndicatorAt),
    };
  }
  return null;
}

/**
 * Align catalog acknowledgement with analytics `lastOkAt` after sources are loaded.
 * Handles the race where the bulk fetch finishes before rebuild status has been polled.
 */
export function reconcileCatalogSyncWithRebuildStatus(input: {
  lastOkAt: string | null | undefined;
  catalogLoadedBaselineLastOkAt: string | null;
  acknowledgedLastOkAt: string | null;
  catalogAcknowledged: boolean;
  awaitingOwnRebuild: boolean;
  catalogReady: boolean;
}): {
  markStale: boolean;
  acknowledgedLastOkAt: string | null;
  setCatalogAcknowledged: boolean;
} {
  const idle = {
    markStale: false,
    acknowledgedLastOkAt: null,
    setCatalogAcknowledged: false,
  };

  if (!input.catalogReady || input.awaitingOwnRebuild) {
    return idle;
  }

  const lastOkAt = input.lastOkAt ?? null;
  const snapshotBaseline = input.catalogLoadedBaselineLastOkAt;

  if (input.catalogAcknowledged) {
    if (
      shouldMarkCatalogStale(
        lastOkAt,
        input.acknowledgedLastOkAt,
        false,
        true,
      )
    ) {
      return { markStale: true, acknowledgedLastOkAt: null, setCatalogAcknowledged: false };
    }
    return idle;
  }

  if (!snapshotBaseline && !lastOkAt) {
    return idle;
  }

  const baseline = snapshotBaseline ?? lastOkAt;
  if (!baseline) {
    return idle;
  }

  if (lastOkAt && lastOkAt > baseline) {
    return {
      markStale: true,
      acknowledgedLastOkAt: baseline,
      setCatalogAcknowledged: true,
    };
  }

  return {
    markStale: false,
    acknowledgedLastOkAt: baseline,
    setCatalogAcknowledged: true,
  };
}

/** Analytics advanced while a bulk sources fetch was in flight (e.g. save in another tab). */
export function shouldMarkCatalogStaleAfterSourcesFetch(
  fetchStartLastOkAt: string | null,
  endLastOkAt: string | null,
  awaitingOwnRebuild: boolean,
): boolean {
  if (awaitingOwnRebuild || !fetchStartLastOkAt || !endLastOkAt) {
    return false;
  }
  return endLastOkAt > fetchStartLastOkAt;
}

export function resolveCatalogAckAfterSourcesFetch(input: {
  fetchStartLastOkAt: string | null;
  endLastOkAt: string | null;
  awaitingOwnRebuild: boolean;
  catalogAlreadyAcknowledged: boolean;
}): { acknowledgedLastOkAt: string | null; markStale: boolean; setAcknowledged: boolean } {
  const snapshotBaseline = input.fetchStartLastOkAt ?? input.endLastOkAt ?? null;

  if (
    shouldMarkCatalogStaleAfterSourcesFetch(
      input.fetchStartLastOkAt,
      input.endLastOkAt,
      input.awaitingOwnRebuild,
    )
  ) {
    return {
      acknowledgedLastOkAt: input.catalogAlreadyAcknowledged
        ? null
        : (input.fetchStartLastOkAt ?? snapshotBaseline),
      markStale: true,
      setAcknowledged: !input.catalogAlreadyAcknowledged,
    };
  }

  if (input.catalogAlreadyAcknowledged) {
    return { acknowledgedLastOkAt: null, markStale: false, setAcknowledged: false };
  }

  if (!snapshotBaseline) {
    return { acknowledgedLastOkAt: null, markStale: false, setAcknowledged: false };
  }

  return { acknowledgedLastOkAt: snapshotBaseline, markStale: false, setAcknowledged: true };
}

/** Baseline `lastOkAt` tied to the in-memory catalog snapshot (set when bulk sources fetch completes). */
export function catalogLoadedBaselineFromFetch(
  fetchStartLastOkAt: string | null,
  endLastOkAt: string | null,
): string | null {
  return fetchStartLastOkAt ?? endLastOkAt ?? null;
}
