import type { CourseCorrelativa, Diagnostic, ZettelPage } from "../types";

export function courseCorrelativasDeprecatedOnCourseDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "course-correlativas-deprecated-on-course",
    message: `Course page "${page.title}" still declares correlativas in frontmatter; move prerequisites to the degree year page courseCorrelativas map.`,
    page: page.title,
  };
}

export function courseCorrelativasInvalidDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "course-correlativas-invalid",
    message: `Course page "${page.title}" has a malformed correlativas frontmatter field; expected a list of course titles.`,
    page: page.title,
  };
}

export function courseCorrelativasSelfDiagnostic(
  page: ZettelPage,
  correlativa: CourseCorrelativa,
): Diagnostic {
  const target = correlativa.resolvedTarget ?? correlativa.target;
  return {
    severity: "error",
    code: "course-correlativas-self",
    message: `Course page "${page.title}" cannot list itself as a correlativa.`,
    page: page.title,
    details: { target },
  };
}

export function courseCorrelativasUnresolvedDiagnostic(
  page: ZettelPage,
  correlativa: CourseCorrelativa,
): Diagnostic {
  return {
    severity: "error",
    code: "course-correlativas-unresolved",
    message: `Course page "${page.title}" lists missing correlativa "${correlativa.target}".`,
    page: page.title,
    details: { target: correlativa.target },
  };
}

export function courseCorrelativasNonCourseDiagnostic(
  page: ZettelPage,
  targetPage: ZettelPage,
): Diagnostic {
  return {
    severity: "error",
    code: "course-correlativas-non-course",
    message: `Course page "${page.title}" lists non-course page "${targetPage.title}" as a correlativa.`,
    page: page.title,
    details: { target: targetPage.title, targetKind: targetPage.kind },
  };
}
