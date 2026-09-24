import { normalizeTitle } from "../normalize";
import { yearPagesForDegree } from "../degree-year";
import { CurriculumGraph, Diagnostic, ZettelPage, PageKind } from "../types";

import {
  degreeYearsCountInvalidDiagnostic,
  degreeYearsMismatchDiagnostic,
  yearCourseNonCourseDiagnostic,
  yearCourseTrayectoOverlapDiagnostic,
  yearCourseUnresolvedDiagnostic,
  yearCoursesMalformedDiagnostic,
  yearCoursesNoEstructuradoMalformedDiagnostic,
  yearDegreeInvalidFrontmatterDiagnostic,
  yearDegreeUnresolvedDiagnostic,
  yearIndexInvalidDiagnostic,
  yearLinkUnresolvedDiagnostic,
  yearLinksNonCourseDiagnostic,
  yearMissingDegreeDiagnostic,
} from "./degree-year-errors";

export function degreeYearDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind === PageKind.Degree) {
      if (page.yearsCountInvalid) {
        const diagnostic = degreeYearsCountInvalidDiagnostic(page);
        diagnostics.push(diagnostic);
        continue;
      }

      if (page.yearsCount === undefined) {
        continue;
      }

      const linkedYears = yearPagesForDegree(graph.pages, page.title);
      if (linkedYears.length !== page.yearsCount) {
        const diagnostic = degreeYearsMismatchDiagnostic(page, linkedYears);
        diagnostics.push(diagnostic);
      }
    }

    if (page.kind !== PageKind.Year) {
      continue;
    }

    if (page.degreeInvalid) {
      const diagnostic = yearDegreeInvalidFrontmatterDiagnostic(page);
      diagnostics.push(diagnostic);
    } else if (!page.degree) {
      const diagnostic = yearMissingDegreeDiagnostic(page);
      diagnostics.push(diagnostic);
    } else {
      const degree = page.degree;
      const degreeTitle = degree.resolvedTarget ?? degree.target;
      const normalizedDegreeTitle = normalizeTitle(degreeTitle);
      const degreePage = graph.pages.find(
        (entry) =>
          entry.kind === PageKind.Degree &&
          normalizeTitle(entry.title) === normalizedDegreeTitle,
      );
      if (!degreePage) {
        const diagnostic = yearDegreeUnresolvedDiagnostic(page, degree);
        diagnostics.push(diagnostic);
      }
    }

    if (page.yearIndexInvalid) {
      const diagnostic = yearIndexInvalidDiagnostic(page);
      diagnostics.push(diagnostic);
    }

    if (page.coursesInvalid) {
      const diagnostic = yearCoursesMalformedDiagnostic(page);
      diagnostics.push(diagnostic);
    }

    if (page.coursesNoEstructuradoInvalid) {
      const diagnostic = yearCoursesNoEstructuradoMalformedDiagnostic(page);
      diagnostics.push(diagnostic);
    }

    const validateYearCourseList = (courses: NonNullable<ZettelPage["courses"]>): void => {
      for (const course of courses) {
        const courseTitle = course.resolvedTarget ?? course.target;
        const normalizedCourseTitle = normalizeTitle(courseTitle);
        const targetPage = graph.pages.find(
          (entry) => normalizeTitle(entry.title) === normalizedCourseTitle,
        );
        if (!targetPage) {
          const diagnostic = yearCourseUnresolvedDiagnostic(page, course);
          diagnostics.push(diagnostic);
          continue;
        }
        if (targetPage.kind !== PageKind.Course) {
          const diagnostic = yearCourseNonCourseDiagnostic(page, course, targetPage);
          diagnostics.push(diagnostic);
        }
      }
    };

    validateYearCourseList(page.courses ?? []);
    validateYearCourseList(page.coursesNoEstructurado ?? []);

    const principalKeys = new Set(
      (page.courses ?? []).map((course) =>
        normalizeTitle(course.resolvedTarget ?? course.target),
      ),
    );
    for (const course of page.coursesNoEstructurado ?? []) {
      const courseLabel = course.resolvedTarget ?? course.target;
      if (principalKeys.has(normalizeTitle(courseLabel))) {
        const diagnostic = yearCourseTrayectoOverlapDiagnostic(page, courseLabel);
        diagnostics.push(diagnostic);
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
    if (yearPage.kind !== PageKind.Year) {
      continue;
    }
    const courseCount =
      (yearPage.courses?.length ?? 0) + (yearPage.coursesNoEstructurado?.length ?? 0);
    if (courseCount > 0) {
      continue;
    }

    for (const ref of yearPage.refs) {
      const targetLabel = ref.resolvedTarget ?? ref.target;
      const normalized = normalizeTitle(targetLabel);

      if (!ref.resolvedTarget) {
        const diagnostic = yearLinkUnresolvedDiagnostic(yearPage, ref);
        diagnostics.push(diagnostic);
        continue;
      }

      const targetPage = pageByTitle.get(normalized);
      const isSelf = normalized === yearPage.normalizedTitle;
      if (targetPage && targetPage.kind !== PageKind.Course && !isSelf) {
        const diagnostic = yearLinksNonCourseDiagnostic(yearPage, ref, targetPage);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}
