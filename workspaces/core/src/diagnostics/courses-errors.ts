import type { Diagnostic, ZettelPage } from "../types";

export function courseWithoutConceptLinksDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "course-without-concept-links",
    message: `Course "${page.title}" has no links to concepts.`,
    page: page.title,
  };
}

export function courseWithoutYearLinkDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "course-without-year-link",
    message: `Course "${page.title}" is not linked from any year page.`,
    page: page.title,
  };
}
