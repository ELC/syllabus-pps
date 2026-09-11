import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, ZettelPage } from "../types";

export function missingExpectedPages(
  graph: CurriculumGraph,
  pageByTitle: ReadonlyMap<string, ZettelPage>,
): Diagnostic[] {
  return graph.expected.years.flatMap((year) => {
    const yearDiagnostics: Diagnostic[] = [];
    if (!pageByTitle.has(normalizeTitle(year.title))) {
      yearDiagnostics.push({
        severity: "error",
        code: "expected-year-missing",
        message: `Expected year page "${year.title}" is missing from the zettelkasten.`,
        page: year.title,
      });
    }

    for (const course of year.courses) {
      if (!pageByTitle.has(normalizeTitle(course))) {
        yearDiagnostics.push({
          severity: "error",
          code: "expected-course-missing",
          message: `Expected course page "${course}" is missing from the zettelkasten.`,
          page: course,
          details: { year: year.title },
        });
      }
    }

    return yearDiagnostics;
  });
}
