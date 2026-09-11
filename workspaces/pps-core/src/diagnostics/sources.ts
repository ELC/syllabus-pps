import {
  blockHasSourceLink,
  buildCurriculumIndexes,
  collectPageBookSources,
  collectPageSources,
  MINIMUM_CONCEPT_SOURCES,
} from "../analysis";
import { CurriculumGraph, Diagnostic } from "../types";

export function conceptMissingBookSource(graph: CurriculumGraph): Diagnostic[] {
  const { curriculumTitles } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "concept")
    .map((page) => ({
      page,
      bookSources: collectPageBookSources(page, curriculumTitles),
    }))
    .filter(({ bookSources }) => bookSources.length === 0)
    .map(({ page }) => ({
      severity: "warning" as const,
      code: "concept-missing-book-source",
      message: `Concept page "${page.title}" has no book source link.`,
      page: page.title,
    }));
}

export function conceptInsufficientSources(
  graph: CurriculumGraph,
  minimumSources = MINIMUM_CONCEPT_SOURCES,
): Diagnostic[] {
  const { curriculumTitles } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "concept")
    .map((page) => ({
      page,
      sources: collectPageSources(page, curriculumTitles),
    }))
    .filter(({ sources }) => sources.length < minimumSources)
    .map(({ page, sources }) => ({
      severity: "warning" as const,
      code: "concept-insufficient-sources",
      message: `Concept page "${page.title}" has ${sources.length} source link(s); target is at least ${minimumSources}.`,
      page: page.title,
      details: { sourceCount: sources.length, minimumSources, sources },
    }));
}

export function conceptNotesWithoutSourceLinks(graph: CurriculumGraph): Diagnostic[] {
  const { curriculumTitles } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "concept")
    .flatMap((page) =>
      page.blocks
        .filter((block) => !blockHasSourceLink(page, block, curriculumTitles))
        .map((block) => ({
          severity: "warning" as const,
          code: "concept-note-without-source-link",
          message: `Concept page "${page.title}" has a note without a source link.`,
          page: page.title,
          line: block.line,
          details: { text: block.text },
        })),
    );
}
