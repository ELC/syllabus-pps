import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  courseCorrelativasDeprecatedOnCourseDiagnostic,
  courseCorrelativasInvalidDiagnostic,
  courseCorrelativasNonCourseDiagnostic,
  courseCorrelativasSelfDiagnostic,
  courseCorrelativasUnresolvedDiagnostic,
} from "./course-correlativas-errors";

export function courseCorrelativasDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const pagesByTitle = indexes.pagesByTitle;
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.correlativas === undefined && !page.correlativasInvalid) {
      continue;
    }

    if (page.kind !== PageKind.Course) {
      continue;
    }

    if (page.correlativasInvalid) {
      diagnostics.push(courseCorrelativasInvalidDiagnostic(page));
      continue;
    }

    if (page.correlativas !== undefined) {
      diagnostics.push(courseCorrelativasDeprecatedOnCourseDiagnostic(page));
    }

    for (const correlativa of page.correlativas ?? []) {
      const resolved = correlativa.resolvedTarget ?? correlativa.target;
      const normalizedResolved = normalizeTitle(resolved);
      const targetPage = pagesByTitle.get(normalizedResolved);

      if (normalizedResolved === page.normalizedTitle) {
        diagnostics.push(courseCorrelativasSelfDiagnostic(page, correlativa));
        continue;
      }

      if (!targetPage) {
        diagnostics.push(courseCorrelativasUnresolvedDiagnostic(page, correlativa));
        continue;
      }

      if (targetPage.kind !== PageKind.Course) {
        diagnostics.push(courseCorrelativasNonCourseDiagnostic(page, targetPage));
      }
    }
  }

  return diagnostics;
}
