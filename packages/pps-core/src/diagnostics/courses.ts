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

export function courseYearDiagnostics(
  graph: CurriculumGraph,
  expectedCourses: Set<string>,
  expectedYears: Set<string>,
): Diagnostic[] {
  const coursesReferencedByYear = new Set(
    graph.pages
      .filter((page) => expectedYears.has(page.normalizedTitle))
      .flatMap((page) =>
        page.refs
          .map((ref) => normalizeTitle(ref.resolvedTarget ?? ref.target))
          .filter((target) => expectedCourses.has(target)),
      ),
  );

  return graph.pages
    .filter((page) => expectedCourses.has(page.normalizedTitle))
    .filter((page) => !coursesReferencedByYear.has(page.normalizedTitle))
    .map((page) => ({
      severity: "warning",
      code: "course-without-year-link",
      message: `Course "${page.title}" is not referenced by an expected year page.`,
      page: page.title,
    }));
}
