import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  courseCorrelativasInvalidDiagnostic,
  courseCorrelativasNonCourseDiagnostic,
  courseCorrelativasOnNonCourseDiagnostic,
  courseCorrelativasSelfDiagnostic,
  courseCorrelativasUnresolvedDiagnostic,
} from "./course-correlativas-errors";

export function courseCorrelativasDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const pagesByTitle = indexes.pagesByTitle;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.correlativas === undefined) {
      continue;
    }

    if (page.kind !== PageKind.Course) {
      const diagnostic = courseCorrelativasOnNonCourseDiagnostic(page);
      diagnostics.push(diagnostic);
      continue;
    }

    if (page.correlativasInvalid) {
      const diagnostic = courseCorrelativasInvalidDiagnostic(page);
      diagnostics.push(diagnostic);
      continue;
    }

    for (const correlativa of page.correlativas) {
      const resolved = correlativa.resolvedTarget ?? correlativa.target;
      const normalizedResolved = normalizeTitle(resolved);
      const targetPage = pagesByTitle.get(normalizedResolved);

      if (normalizedResolved === page.normalizedTitle) {
        const diagnostic = courseCorrelativasSelfDiagnostic(page, correlativa);
        diagnostics.push(diagnostic);
        continue;
      }

      if (!targetPage) {
        const diagnostic = courseCorrelativasUnresolvedDiagnostic(page, correlativa);
        diagnostics.push(diagnostic);
        continue;
      }

      if (targetPage.kind !== PageKind.Course) {
        const diagnostic = courseCorrelativasNonCourseDiagnostic(page, targetPage);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}
