import type { PageListItem } from "@pps/content";
import {
  EDITOR_CATALOG_STALE_MESSAGE,
  EDITOR_HEADER_LOADING_CATALOG_LABEL,
  EDITOR_HEADER_SAVING_LABEL,
  EDITOR_HEADER_UPDATING_ANALYTICS_LABEL,
  EDITOR_REBUILD_STATUS_POLL,
  EDITOR_SAVE_SUCCESS_INDICATOR_LABEL,
  formatEditorCloudSaveIndicatorLabel,
  isAnalyticsRebuildRunning,
  isEditorRebuildSaveBlocked,
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  resolveEditorHeaderIndicatorOverride,
  resolveEditorSaveBlockReason,
  shouldRecheckEntityAfterAnalyticsAdvance,
  type EditorHeaderIndicatorOverride,
  type EditorHeaderIndicatorPhase,
  type EditorSaveBlockReason,
} from "@pps/content/browser";

export type CmsSaveBlockReason = EditorSaveBlockReason;

export type CmsHeaderIndicatorPhase = EditorHeaderIndicatorPhase;

export type CmsHeaderIndicatorOverride = EditorHeaderIndicatorOverride;

export const CMS_CATALOG_STALE_MESSAGE = EDITOR_CATALOG_STALE_MESSAGE;

export const CMS_SAVE_SUCCESS_INDICATOR_LABEL = EDITOR_SAVE_SUCCESS_INDICATOR_LABEL;

export const CMS_HEADER_SAVING_PAGE_LABEL = EDITOR_HEADER_SAVING_LABEL;

export const CMS_HEADER_LOADING_CATALOG_LABEL = EDITOR_HEADER_LOADING_CATALOG_LABEL;

export const CMS_HEADER_UPDATING_ANALYTICS_LABEL = EDITOR_HEADER_UPDATING_ANALYTICS_LABEL;

export const CMS_REBUILD_STATUS_POLL = EDITOR_REBUILD_STATUS_POLL;

export const formatCmsCloudSaveIndicatorLabel = formatEditorCloudSaveIndicatorLabel;

export {
  isAnalyticsRebuildRunning,
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  shouldRecheckEntityAfterAnalyticsAdvance,
};

export const isCmsRebuildSaveBlocked = isEditorRebuildSaveBlocked;

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

export function resolveCmsSaveBlockReason(input: {
  entityStale: boolean;
  sourcesLoading: boolean;
  rebuildStatus: Parameters<typeof resolveEditorSaveBlockReason>[0]["rebuildStatus"];
  awaitingOwnRebuild: boolean;
  hasBlockingDiagnostics: boolean;
}): CmsSaveBlockReason {
  return resolveEditorSaveBlockReason({
    entityStale: input.entityStale,
    catalogLoading: input.sourcesLoading,
    rebuildStatus: input.rebuildStatus,
    awaitingOwnRebuild: input.awaitingOwnRebuild,
    hasBlockingValidation: input.hasBlockingDiagnostics,
  });
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

export function resolveCmsHeaderIndicatorOverride(
  input: Parameters<typeof resolveEditorHeaderIndicatorOverride>[0],
): CmsHeaderIndicatorOverride | null {
  return resolveEditorHeaderIndicatorOverride(input);
}
