import {
  blockHasSourceLink,
  buildCurriculumIndexes,
  collectPageBookSources,
  collectPageSources,
  MINIMUM_CONCEPT_SOURCES,
} from "../analysis";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  conceptInsufficientSourcesDiagnostic,
  conceptMissingBookSourceDiagnostic,
  conceptNoteWithoutSourceLinkDiagnostic,
} from "./sources-errors";

export function conceptMissingBookSource(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const curriculumTitles = indexes.curriculumTitles;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    const bookSources = collectPageBookSources(page, curriculumTitles);
    if (bookSources.length > 0) {
      continue;
    }
    const diagnostic = conceptMissingBookSourceDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function conceptInsufficientSources(
  graph: CurriculumGraph,
  minimumSources = MINIMUM_CONCEPT_SOURCES,
): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const curriculumTitles = indexes.curriculumTitles;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    const sources = collectPageSources(page, curriculumTitles);
    if (sources.length >= minimumSources) {
      continue;
    }
    const diagnostic = conceptInsufficientSourcesDiagnostic(page, sources);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function conceptNotesWithoutSourceLinks(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const curriculumTitles = indexes.curriculumTitles;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    for (const block of page.blocks) {
      const hasSource = blockHasSourceLink(page, block, curriculumTitles);
      if (hasSource) {
        continue;
      }
      const diagnostic = conceptNoteWithoutSourceLinkDiagnostic(page, block);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
