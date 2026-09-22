import type { ConceptCurationEditAction } from "./concept-curation-edit-action";
import type { RoadmapCuration } from "./curation";

export const CONCEPT_CURATION_HISTORY_LIMIT = 20;

export type ConceptCurationHistoryEntry = {
  readonly curation: RoadmapCuration;
  readonly action: ConceptCurationEditAction;
};

export type ConceptCurationHistory = {
  readonly entries: readonly ConceptCurationHistoryEntry[];
  readonly index: number;
};

export function createConceptCurationHistory(
  initial: RoadmapCuration,
  action: ConceptCurationEditAction = { kind: "load" },
): ConceptCurationHistory {
  return {
    entries: [{ curation: structuredClone(initial), action }],
    index: 0,
  };
}

export function currentConceptCurationHistoryEntry(
  history: ConceptCurationHistory,
): ConceptCurationHistoryEntry {
  return history.entries[history.index]!;
}

export function currentConceptCuration(history: ConceptCurationHistory): RoadmapCuration {
  return currentConceptCurationHistoryEntry(history).curation;
}

export function previousConceptCurationHistoryEntry(
  history: ConceptCurationHistory,
): ConceptCurationHistoryEntry | null {
  if (history.index <= 0) {
    return null;
  }

  return history.entries[history.index - 1] ?? null;
}

export function canUndoConceptCuration(history: ConceptCurationHistory): boolean {
  return history.index > 0;
}

export function canRedoConceptCuration(history: ConceptCurationHistory): boolean {
  return history.index < history.entries.length - 1;
}

export function pushConceptCurationHistory(
  history: ConceptCurationHistory,
  next: RoadmapCuration,
  action: ConceptCurationEditAction,
): ConceptCurationHistory {
  const snapshot: ConceptCurationHistoryEntry = {
    curation: structuredClone(next),
    action,
  };
  const entries = [...history.entries.slice(0, history.index + 1), snapshot];

  let index = entries.length - 1;
  while (entries.length > CONCEPT_CURATION_HISTORY_LIMIT) {
    entries.shift();
    index -= 1;
  }

  return { entries, index };
}

export function undoConceptCurationHistory(
  history: ConceptCurationHistory,
): ConceptCurationHistory | null {
  if (!canUndoConceptCuration(history)) {
    return null;
  }

  return { entries: history.entries, index: history.index - 1 };
}

export function redoConceptCurationHistory(
  history: ConceptCurationHistory,
): ConceptCurationHistory | null {
  if (!canRedoConceptCuration(history)) {
    return null;
  }

  return { entries: history.entries, index: history.index + 1 };
}
