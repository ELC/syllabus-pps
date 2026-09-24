import {
  formatPpsLocalDateTime,
  type AnalyticsRebuildStatus,
} from "./analytics-rebuild-status-browser";

export type EditorSaveBlockReason = "diagnostics" | "loading" | "rebuild" | "stale" | null;

export const EDITOR_CATALOG_STALE_MESSAGE =
  "Este contenido no está actualizado. Recargá la página para continuar.";

export const EDITOR_SAVE_SUCCESS_INDICATOR_LABEL = "Guardado en la nube exitosamente";

export function formatEditorCloudSaveIndicatorLabel(savedAtIso: string): string {
  const stamp = formatPpsLocalDateTime(savedAtIso);
  if (!stamp) {
    return EDITOR_SAVE_SUCCESS_INDICATOR_LABEL;
  }
  return `${EDITOR_SAVE_SUCCESS_INDICATOR_LABEL} ${stamp}`;
}

export const EDITOR_HEADER_SAVING_LABEL = "Guardando…";

export const EDITOR_HEADER_LOADING_CATALOG_LABEL = "Cargando el catálogo…";

export const EDITOR_HEADER_UPDATING_ANALYTICS_LABEL = "Actualizando analítica…";

export const EDITOR_HEADER_UNSAVED_CHANGES_LABEL =
  "Cambios sin guardar. Usá el ícono de guardar.";

export type EditorHeaderIndicatorPhase = "updated" | "updating" | "unknown";

export type EditorHeaderIndicatorOverride = {
  phase: EditorHeaderIndicatorPhase;
  label: string;
};

/** Faster idle polling so cross-tab saves surface entity drift sooner (default is 5s). */
export const EDITOR_REBUILD_STATUS_POLL = {
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

/** Block save while analytics rebuild runs anywhere (one edge execution at a time). */
export function isEditorRebuildSaveBlocked(
  status: AnalyticsRebuildStatus | null,
  awaitingOwnRebuild: boolean,
): boolean {
  return awaitingOwnRebuild || isAnalyticsRebuildRunning(status);
}

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
    return sawRunning;
  }
  return lastOkAt > baselineLastOkAt;
}

/** Lock Nueva / Guardar while the analytics edge runs or this tab finishes its own save. */
export function isEditorWorkspaceActionsLocked(input: {
  rebuildStatus: AnalyticsRebuildStatus | null;
  awaitingOwnRebuild: boolean;
  savingEntity: boolean;
}): boolean {
  return (
    input.savingEntity ||
    input.awaitingOwnRebuild ||
    isAnalyticsRebuildRunning(input.rebuildStatus)
  );
}

/** True when remote storage content differs from the baseline snapshot for this entity only. */
export function isEntityContentStale(remoteContent: string, baselineContent: string): boolean {
  return remoteContent !== baselineContent;
}

/**
 * After analytics finishes a rebuild, re-fetch only the open entity (page or resource).
 * CMS and Cites use separate editors; a rebuild triggered elsewhere may not touch this entity.
 */
export function shouldRecheckEntityAfterAnalyticsAdvance(input: {
  lastOkAt: string | null | undefined;
  acknowledgedLastOkAt: string | null;
  awaitingOwnRebuild: boolean;
}): boolean {
  if (input.awaitingOwnRebuild) {
    return false;
  }
  const lastOkAt = input.lastOkAt ?? null;
  if (!lastOkAt || !input.acknowledgedLastOkAt) {
    return Boolean(lastOkAt && !input.acknowledgedLastOkAt);
  }
  return lastOkAt > input.acknowledgedLastOkAt;
}

export function resolveEditorSaveBlockReason(input: {
  entityStale: boolean;
  catalogLoading: boolean;
  rebuildStatus: AnalyticsRebuildStatus | null;
  awaitingOwnRebuild: boolean;
  hasBlockingValidation: boolean;
}): EditorSaveBlockReason {
  if (input.entityStale) {
    return "stale";
  }
  if (input.catalogLoading) {
    return "loading";
  }
  if (isEditorRebuildSaveBlocked(input.rebuildStatus, input.awaitingOwnRebuild)) {
    return "rebuild";
  }
  if (input.hasBlockingValidation) {
    return "diagnostics";
  }
  return null;
}

export function resolveEditorHeaderIndicatorOverride(input: {
  entityStale: boolean;
  savingPage: boolean;
  cloudSaveIndicatorAt: string | null;
  saveBlockReason: EditorSaveBlockReason;
  awaitingOwnRebuild: boolean;
  rebuildStatus: AnalyticsRebuildStatus | null;
  hasUnsavedChanges?: boolean;
  /** Last known server sync (e.g. page updatedAt) when the editor matches baseline. */
  entityBaselineSyncedAt?: string | null;
}): EditorHeaderIndicatorOverride | null {
  if (input.entityStale) {
    return { phase: "unknown", label: EDITOR_CATALOG_STALE_MESSAGE };
  }
  if (input.savingPage) {
    return { phase: "updating", label: EDITOR_HEADER_SAVING_LABEL };
  }
  if (input.saveBlockReason === "loading") {
    const openPageSynced =
      Boolean(input.cloudSaveIndicatorAt) || Boolean(input.entityBaselineSyncedAt);
    if (!openPageSynced) {
      return { phase: "updating", label: EDITOR_HEADER_LOADING_CATALOG_LABEL };
    }
  }
  if (input.hasUnsavedChanges) {
    return { phase: "updating", label: EDITOR_HEADER_UNSAVED_CHANGES_LABEL };
  }
  if (input.awaitingOwnRebuild) {
    return { phase: "updating", label: EDITOR_HEADER_UPDATING_ANALYTICS_LABEL };
  }
  if (isAnalyticsRebuildRunning(input.rebuildStatus)) {
    return null;
  }
  const syncedAt = input.cloudSaveIndicatorAt ?? input.entityBaselineSyncedAt ?? null;
  if (syncedAt) {
    return {
      phase: "updated",
      label: formatEditorCloudSaveIndicatorLabel(syncedAt),
    };
  }
  return null;
}
