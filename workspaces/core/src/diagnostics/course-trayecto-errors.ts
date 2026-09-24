import { courseTrayectos, type Diagnostic, type ZettelPage } from "../types";

const TRAYECTO_EXPECTED_LIST = courseTrayectos.map((trayecto) => `"${trayecto}"`).join(", ");

export function courseTrayectoOnNonCourseDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "course-trayecto-on-non-course",
    message: `Page "${page.title}" declares trayecto but is not a course page.`,
    page: page.title,
  };
}

export function courseTrayectoInvalidDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "course-trayecto-invalid",
    message: `Course page "${page.title}" has a malformed trayecto frontmatter field; expected one of ${TRAYECTO_EXPECTED_LIST}.`,
    page: page.title,
  };
}

export function courseTrayectoDeprecatedDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "warning",
    code: "course-trayecto-deprecated",
    message: `Course page "${page.title}" declares trayecto in frontmatter; assign the course to Trayecto Principal or Trayecto No Estructurado on the degree year page instead.`,
    page: page.title,
  };
}
