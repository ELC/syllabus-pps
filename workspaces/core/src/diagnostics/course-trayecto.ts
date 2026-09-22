import { courseTrayectos, CurriculumGraph, Diagnostic } from "../types";

export function courseTrayectoDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.trayecto === undefined && !page.trayectoInvalid) {
      continue;
    }

    if (page.kind !== "course") {
      diagnostics.push({
        severity: "warning",
        code: "course-trayecto-on-non-course",
        message: `Page "${page.title}" declares trayecto but is not a course page.`,
        page: page.title,
      });
      continue;
    }

    if (page.trayectoInvalid) {
      diagnostics.push({
        severity: "error",
        code: "course-trayecto-invalid",
        message: `Course page "${page.title}" has a malformed trayecto frontmatter field; expected one of ${courseTrayectos.map((trayecto) => `"${trayecto}"`).join(", ")}.`,
        page: page.title,
      });
    }
  }

  return diagnostics;
}
