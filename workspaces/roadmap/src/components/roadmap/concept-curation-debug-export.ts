import type { ConceptEditTool } from "./concept-edit-tools";
import { conceptLayoutDocumentFromCuration } from "./concept-curation";
import type { ConceptCurationEditAction } from "./concept-curation-edit-action";
import {
  currentConceptCurationHistoryEntry,
  previousConceptCurationHistoryEntry,
  type ConceptCurationHistory,
} from "./concept-curation-history";
import type { RoadmapCuration } from "./curation";

export const CONCEPT_CURATION_DEBUG_EXPORT_KIND = "roadmap-concept-layout-debug" as const;

export type ConceptCurationDebugExport = {
  readonly kind: typeof CONCEPT_CURATION_DEBUG_EXPORT_KIND;
  readonly exportedAt: string;
  readonly degreeSlug: string;
  readonly courseSlug: string;
  readonly selectedTopic: string | null;
  readonly editTool: ConceptEditTool;
  readonly historyIndex: number;
  readonly historyLength: number;
  readonly lastAction: ConceptCurationEditAction | null;
  readonly previousCuration: Record<string, unknown> | null;
  readonly curation: Record<string, unknown>;
};

export function buildConceptCurationDebugExport(input: {
  degreeSlug: string;
  courseSlug: string;
  curation: RoadmapCuration;
  history: ConceptCurationHistory | null;
  selectedTopic: string | null;
  editTool: ConceptEditTool;
  exportedAt?: string;
}): ConceptCurationDebugExport {
  const history = input.history;
  const currentEntry = history
    ? currentConceptCurationHistoryEntry(history)
    : null;
  const previousEntry = history ? previousConceptCurationHistoryEntry(history) : null;
  const curation = currentEntry?.curation ?? input.curation;

  return {
    kind: CONCEPT_CURATION_DEBUG_EXPORT_KIND,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    degreeSlug: input.degreeSlug,
    courseSlug: input.courseSlug,
    selectedTopic: input.selectedTopic,
    editTool: input.editTool,
    historyIndex: history?.index ?? 0,
    historyLength: history?.entries.length ?? 1,
    lastAction: currentEntry?.action ?? null,
    previousCuration: previousEntry
      ? conceptLayoutDocumentFromCuration(previousEntry.curation)
      : null,
    curation: conceptLayoutDocumentFromCuration(curation),
  };
}

export async function copyConceptCurationDebugExport(
  payload: ConceptCurationDebugExport,
): Promise<void> {
  const text = JSON.stringify(payload, null, 2);
  await navigator.clipboard.writeText(text);
}
