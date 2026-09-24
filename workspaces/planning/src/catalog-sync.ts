import {
  EDITOR_REBUILD_STATUS_POLL,
  resolveEditorHeaderIndicatorOverride,
  resolveEditorSaveBlockReason,
  type EditorHeaderIndicatorOverride,
  type EditorSaveBlockReason,
} from "@pps/content/browser";

export type PlanningSaveBlockReason = EditorSaveBlockReason;
export type PlanningHeaderIndicatorOverride = EditorHeaderIndicatorOverride;

export const PLANNING_REBUILD_STATUS_POLL = EDITOR_REBUILD_STATUS_POLL;

export function resolvePlanningSaveBlockReason(input: {
  entityStale: boolean;
  catalogLoading: boolean;
  rebuildStatus: Parameters<typeof resolveEditorSaveBlockReason>[0]["rebuildStatus"];
  awaitingOwnRebuild: boolean;
}): PlanningSaveBlockReason {
  return resolveEditorSaveBlockReason({
    ...input,
    hasBlockingValidation: false,
  });
}

export const resolvePlanningHeaderIndicatorOverride = resolveEditorHeaderIndicatorOverride;
