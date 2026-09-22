import { normalizeTitle } from "../normalize";
import { resolveDegreeTitle, yearPagesForDegree } from "../degree-year";
import { CurriculumGraph, Diagnostic, ZettelPage } from "../types";

export function degreeYearDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind === "degree") {
      if (page.yearsCountInvalid) {
        diagnostics.push({
          severity: "error",
          code: "degree-years-count-invalid",
          message: `Degree "${page.title}" has an invalid years count in frontmatter.`,
          page: page.title,
        });
        continue;
      }

      if (page.yearsCount === undefined) {
        continue;
      }

      const linkedYears = yearPagesForDegree(graph.pages, page.title);
      if (linkedYears.length !== page.yearsCount) {
        diagnostics.push({
          severity: "warning",
          code: "degree-years-mismatch",
          message: `Degree "${page.title}" declares ${page.yearsCount} year(s) but ${linkedYears.length} year page(s) reference it.`,
          page: page.title,
          details: { declared: page.yearsCount, linked: linkedYears.length },
        });
      }
    }

    if (page.kind !== "year") {
      continue;
    }

    if (page.degreeInvalid) {
      diagnostics.push({
        severity: "error",
        code: "year-degree-unresolved",
        message: `Year page "${page.title}" has invalid degree frontmatter.`,
        page: page.title,
      });
    } else if (!page.degree) {
      diagnostics.push({
        severity: "error",
        code: "year-missing-degree",
        message: `Year page "${page.title}" must declare a degree.`,
        page: page.title,
      });
    } else {
      const degreeTitle = page.degree.resolvedTarget ?? page.degree.target;
      const degreePage = graph.pages.find(
        (entry) =>
          entry.kind === "degree" &&
          normalizeTitle(entry.title) === normalizeTitle(degreeTitle),
      );
      if (!degreePage) {
        diagnostics.push({
          severity: "error",
          code: "year-degree-unresolved",
          message: `Year page "${page.title}" references unresolved degree "${page.degree.target}".`,
          page: page.title,
        });
      }
    }

    if (page.yearIndexInvalid) {
      diagnostics.push({
        severity: "error",
        code: "year-index-invalid",
        message: `Year page "${page.title}" has an invalid yearIndex.`,
        page: page.title,
      });
    }

    if (page.coursesInvalid) {
      diagnostics.push({
        severity: "error",
        code: "year-courses-unresolved",
        message: `Year page "${page.title}" has malformed courses frontmatter.`,
        page: page.title,
      });
    }

    for (const course of page.courses ?? []) {
      const courseTitle = course.resolvedTarget ?? course.target;
      const targetPage = graph.pages.find(
        (entry) => normalizeTitle(entry.title) === normalizeTitle(courseTitle),
      );
      if (!targetPage) {
        diagnostics.push({
          severity: "error",
          code: "year-courses-unresolved",
          message: `Year page "${page.title}" lists unresolved course "${course.target}".`,
          page: page.title,
        });
        continue;
      }
      if (targetPage && targetPage.kind !== "course") {
        diagnostics.push({
          severity: "warning",
          code: "year-courses-non-course",
          message: `Year page "${page.title}" lists "${course.resolvedTarget}", which is not a course page.`,
          page: page.title,
          details: { targetKind: targetPage.kind },
        });
      }
    }
  }

  return diagnostics;
}

export function yearBodyLinkDiagnostics(
  graph: CurriculumGraph,
  pageByTitle: ReadonlyMap<string, ZettelPage>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const yearPage of graph.pages) {
    if (yearPage.kind !== "year") {
      continue;
    }
    if ((yearPage.courses?.length ?? 0) > 0) {
      continue;
    }

    for (const ref of yearPage.refs) {
      const targetLabel = ref.resolvedTarget ?? ref.target;
      const normalized = normalizeTitle(targetLabel);

      if (!ref.resolvedTarget) {
        diagnostics.push({
          severity: "error",
          code: "year-link-unresolved",
          message: `Year page "${yearPage.title}" links to unresolved page "${ref.target}".`,
          page: yearPage.title,
          line: ref.line,
        });
        continue;
      }

      const targetPage = pageByTitle.get(normalized);
      if (
        targetPage &&
        targetPage.kind !== "course" &&
        normalized !== yearPage.normalizedTitle
      ) {
        diagnostics.push({
          severity: "warning",
          code: "year-links-non-course",
          message: `Year page "${yearPage.title}" links to "${targetLabel}", which is not a course page.`,
          page: yearPage.title,
          line: ref.line,
          details: { targetKind: targetPage.kind },
        });
      }
    }
  }

  return diagnostics;
}
