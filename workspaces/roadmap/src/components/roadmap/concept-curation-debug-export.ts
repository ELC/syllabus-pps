import type { ConceptEditTool } from "./concept-edit-tools";
import { conceptLayoutDocumentFromCuration } from "./concept-curation";
import type { ConceptCurationEditAction } from "./concept-curation-edit-action";
import {
  currentConceptCurationHistoryEntry,
  previousConceptCurationHistoryEntry,
  type ConceptCurationHistory,
} from "./concept-curation-history";
import type { RoadmapConceptLayoutDocument, RoadmapCuration } from "@pps/core";

export enum ConceptCurationDebugExportKind {
  RoadmapConceptLayoutDebug = "roadmap-concept-layout-debug",
}

export interface ConceptCurationDebugExport {
  readonly kind: ConceptCurationDebugExportKind.RoadmapConceptLayoutDebug;
  readonly exportedAt: string;
  readonly degreeSlug: string;
  readonly courseSlug: string;
  readonly selectedTopic: string | null;
  readonly editTool: ConceptEditTool;
  readonly historyIndex: number;
  readonly historyLength: number;
  readonly lastAction: ConceptCurationEditAction | null;
  readonly previousCuration: RoadmapConceptLayoutDocument | null;
  readonly curation: RoadmapConceptLayoutDocument;
}

export interface ConceptCurationDebugExportInput {
  readonly degreeSlug: string;
  readonly courseSlug: string;
  readonly curation: RoadmapCuration;
  readonly history: ConceptCurationHistory | null;
  readonly selectedTopic: string | null;
  readonly editTool: ConceptEditTool;
  readonly exportedAt?: string;
}

export function buildConceptCurationDebugExport(
  input: ConceptCurationDebugExportInput,
): ConceptCurationDebugExport {
  const history = input.history;
  const currentEntry = history
    ? currentConceptCurationHistoryEntry(history)
    : null;
  const previousEntry = history ? previousConceptCurationHistoryEntry(history) : null;
  const curation = currentEntry?.curation ?? input.curation;

  const payload: ConceptCurationDebugExport = {
    kind: ConceptCurationDebugExportKind.RoadmapConceptLayoutDebug,
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

  return payload;
}

export async function copyConceptCurationDebugExport(
  payload: ConceptCurationDebugExport,
): Promise<void> {
  const text = JSON.stringify(payload, null, 2);
  await navigator.clipboard.writeText(text);
}
