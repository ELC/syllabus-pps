import { blockHasSourceLink, buildCurriculumIndexes } from "../analysis";
import { CurriculumGraph, Diagnostic } from "../types";

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
