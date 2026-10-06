import type { CourseCorrelativa, Diagnostic, ZettelPage } from "../types";

export function yearCourseCorrelativasOnNonYearDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "year-course-correlativas-on-non-year",
    message: `Page "${page.title}" declares courseCorrelativas but is not a year page.`,
    page: page.title,
  };
}

export function yearCourseCorrelativasInvalidDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-course-correlativas-invalid",
    message: `Year page "${page.title}" has a malformed courseCorrelativas field; expected a map of course slugs to title lists.`,
    page: page.title,
  };
}

export function yearCourseCorrelativasUnlistedDiagnostic(
  page: ZettelPage,
  courseSlug: string,
): Diagnostic {
  return {
    severity: "error",
    code: "year-course-correlativas-unlisted",
    message: `Year page "${page.title}" lists courseCorrelativas for "${courseSlug}" but that course is not on this year's courses or coursesNoEstructurado lists.`,
    page: page.title,
    details: { courseSlug },
  };
}

export function yearCourseCorrelativasSelfDiagnostic(
  page: ZettelPage,
  courseTitle: string,
  correlativa: CourseCorrelativa,
): Diagnostic {
  const target = correlativa.resolvedTarget ?? correlativa.target;
  return {
    severity: "error",
    code: "year-course-correlativas-self",
    message: `Year page "${page.title}" lists course "${courseTitle}" with itself as a correlativa.`,
    page: page.title,
    details: { courseTitle, target },
  };
}

export function yearCourseCorrelativasUnresolvedDiagnostic(
  page: ZettelPage,
  courseTitle: string,
  correlativa: CourseCorrelativa,
): Diagnostic {
  return {
    severity: "error",
    code: "year-course-correlativas-unresolved",
    message: `Year page "${page.title}" lists missing correlativa "${correlativa.target}" for course "${courseTitle}".`,
    page: page.title,
    details: { courseTitle, target: correlativa.target },
  };
}

export function yearCourseCorrelativasNonCourseDiagnostic(
  page: ZettelPage,
  courseTitle: string,
  targetPage: ZettelPage,
): Diagnostic {
  return {
    severity: "error",
    code: "year-course-correlativas-non-course",
    message: `Year page "${page.title}" lists non-course page "${targetPage.title}" as a correlativa of "${courseTitle}".`,
    page: page.title,
    details: { courseTitle, target: targetPage.title, targetKind: targetPage.kind },
  };
}
