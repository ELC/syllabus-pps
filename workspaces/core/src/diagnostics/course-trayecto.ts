import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  courseTrayectoInvalidDiagnostic,
  courseTrayectoOnNonCourseDiagnostic,
} from "./course-trayecto-errors";

export function courseTrayectoDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.trayecto === undefined && !page.trayectoInvalid) {
      continue;
    }

    if (page.kind !== PageKind.Course) {
      const diagnostic = courseTrayectoOnNonCourseDiagnostic(page);
      diagnostics.push(diagnostic);
      continue;
    }

    if (page.trayectoInvalid) {
      const diagnostic = courseTrayectoInvalidDiagnostic(page);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
