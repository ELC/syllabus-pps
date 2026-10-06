import { buildCurriculumIndexes } from "../analysis";
import { resolveCoursePageTitle } from "../degree-year";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  yearCourseCorrelativasInvalidDiagnostic,
  yearCourseCorrelativasNonCourseDiagnostic,
  yearCourseCorrelativasOnNonYearDiagnostic,
  yearCourseCorrelativasSelfDiagnostic,
  yearCourseCorrelativasUnlistedDiagnostic,
  yearCourseCorrelativasUnresolvedDiagnostic,
} from "./year-course-correlativas-errors";

function courseSlugListedOnYearPage(
  page: CurriculumGraph["pages"][number],
  courseSlug: string,
  pages: CurriculumGraph["pages"],
): boolean {
  const courseTitle = resolveCoursePageTitle(courseSlug, pages);
  if (!courseTitle) {
    return false;
  }

  for (const field of ["courses", "coursesNoEstructurado"] as const) {
    for (const ref of page[field] ?? []) {
      const label = ref.resolvedTarget ?? ref.target;
      const normalizedLabel = normalizeTitle(label);
      if (
        normalizedLabel === normalizeTitle(courseSlug) ||
        normalizedLabel === normalizeTitle(courseTitle)
      ) {
        return true;
      }
      const resolvedTitle = resolveCoursePageTitle(label, pages);
      if (resolvedTitle && normalizeTitle(resolvedTitle) === normalizeTitle(courseTitle)) {
        return true;
      }
    }
  }
  return false;
}

export function yearCourseCorrelativasDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const pagesByTitle = indexes.pagesByTitle;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.courseCorrelativas === undefined && !page.courseCorrelativasInvalid) {
      continue;
    }

    if (page.kind !== PageKind.Year) {
      if (page.courseCorrelativas !== undefined || page.courseCorrelativasInvalid) {
        diagnostics.push(yearCourseCorrelativasOnNonYearDiagnostic(page));
      }
      continue;
    }

    if (page.courseCorrelativasInvalid) {
      diagnostics.push(yearCourseCorrelativasInvalidDiagnostic(page));
      continue;
    }

    if (!page.courseCorrelativas) {
      continue;
    }

    for (const [courseSlug, correlativas] of Object.entries(page.courseCorrelativas)) {
      if (!courseSlugListedOnYearPage(page, courseSlug, graph.pages)) {
        diagnostics.push(yearCourseCorrelativasUnlistedDiagnostic(page, courseSlug));
      }

      const courseTitle = resolveCoursePageTitle(courseSlug, graph.pages);
      if (!courseTitle) {
        continue;
      }

      for (const correlativa of correlativas) {
        const resolved = correlativa.resolvedTarget ?? correlativa.target;
        const normalizedResolved = normalizeTitle(resolved);

        if (normalizedResolved === normalizeTitle(courseTitle)) {
          diagnostics.push(yearCourseCorrelativasSelfDiagnostic(page, courseTitle, correlativa));
          continue;
        }

        const targetPage = pagesByTitle.get(normalizedResolved);
        if (!targetPage) {
          diagnostics.push(
            yearCourseCorrelativasUnresolvedDiagnostic(page, courseTitle, correlativa),
          );
          continue;
        }

        if (targetPage.kind !== PageKind.Course) {
          diagnostics.push(
            yearCourseCorrelativasNonCourseDiagnostic(page, courseTitle, targetPage),
          );
        }
      }
    }
  }

  return diagnostics;
}
