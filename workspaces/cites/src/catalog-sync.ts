import {
  EDITOR_CATALOG_STALE_MESSAGE,
  EDITOR_REBUILD_STATUS_POLL,
  resolveEditorHeaderIndicatorOverride,
  resolveEditorSaveBlockReason,
  type EditorHeaderIndicatorOverride,
  type EditorSaveBlockReason,
} from "@pps/content/browser";

export type CitesSaveBlockReason = EditorSaveBlockReason;

export type CitesHeaderIndicatorOverride = EditorHeaderIndicatorOverride;

export const CITES_CATALOG_STALE_MESSAGE = EDITOR_CATALOG_STALE_MESSAGE;

export const CITES_REBUILD_STATUS_POLL = EDITOR_REBUILD_STATUS_POLL;

export function resolveCitesSaveBlockReason(input: {
  entityStale: boolean;
  catalogLoading: boolean;
  rebuildStatus: Parameters<typeof resolveEditorSaveBlockReason>[0]["rebuildStatus"];
  awaitingOwnRebuild: boolean;
  hasCatalogIssues: boolean;
}): CitesSaveBlockReason {
  return resolveEditorSaveBlockReason({
    entityStale: input.entityStale,
    catalogLoading: input.catalogLoading,
    rebuildStatus: input.rebuildStatus,
    awaitingOwnRebuild: input.awaitingOwnRebuild,
    hasBlockingValidation: input.hasCatalogIssues,
  });
}

export function citesSaveBlockMessage(reason: CitesSaveBlockReason): string | null {
  switch (reason) {
    case "diagnostics":
      return "Corregí los problemas de validación del catálogo antes de guardar.";
    default:
      return null;
  }
}

export const resolveCitesHeaderIndicatorOverride = resolveEditorHeaderIndicatorOverride;
