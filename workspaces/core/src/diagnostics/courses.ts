import { coursesLinkedToYearPage } from "../degree-year";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic } from "../types";

export function courseWithoutConceptLinks(graph: CurriculumGraph): Diagnostic[] {
  const conceptTitles = new Set(
    graph.pages.filter((page) => page.kind === "concept").map((page) => page.normalizedTitle),
  );

  return graph.pages
    .filter((page) => page.kind === "course")
    .filter((page) => {
      const hasConceptTags = page.tags.length > 0;
      const hasConceptRefs = page.refs.some((ref) =>
        conceptTitles.has(normalizeTitle(ref.resolvedTarget ?? ref.target)),
      );

      return !hasConceptTags && !hasConceptRefs;
    })
    .map((page) => ({
      severity: "warning" as const,
      code: "course-without-concept-links",
      message: `Course "${page.title}" has no links to concepts.`,
      page: page.title,
    }));
}

export function courseYearDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const pagesByTitle = new Map(graph.pages.map((page) => [page.normalizedTitle, page]));

  const coursesReferencedByYear = new Set(
    graph.pages
      .filter((page) => page.kind === "year")
      .flatMap((yearPage) =>
        coursesLinkedToYearPage(yearPage, graph).map((title) => normalizeTitle(title)),
      ),
  );

  return graph.pages
    .filter((page) => page.kind === "course")
    .filter((page) => !coursesReferencedByYear.has(page.normalizedTitle))
    .map((page) => ({
      severity: "warning" as const,
      code: "course-without-year-link" as const,
      message: `Course "${page.title}" is not linked from any year page.`,
      page: page.title,
    }));
}
