import { coursesLinkedToYearPage } from "../degree-year";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  courseWithoutConceptLinksDiagnostic,
  courseWithoutYearLinkDiagnostic,
} from "./courses-errors";

export function courseWithoutConceptLinks(graph: CurriculumGraph): Diagnostic[] {
  const conceptTitles = new Set(
    graph.pages.filter((page) => page.kind === PageKind.Concept).map((page) => page.normalizedTitle),
  );

  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Course) {
      continue;
    }

    const hasConceptTags = page.tags.length > 0;
    let hasConceptRefs = false;
    for (const ref of page.refs) {
      const refTarget = ref.resolvedTarget ?? ref.target;
      const normalizedRef = normalizeTitle(refTarget);
      if (conceptTitles.has(normalizedRef)) {
        hasConceptRefs = true;
        break;
      }
    }

    if (!hasConceptTags && !hasConceptRefs) {
      const diagnostic = courseWithoutConceptLinksDiagnostic(page);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

export function courseYearDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const coursesReferencedByYear = new Set<string>();

  for (const yearPage of graph.pages) {
    if (yearPage.kind !== PageKind.Year) {
      continue;
    }
    const linkedCourses = coursesLinkedToYearPage(yearPage, graph);
    for (const title of linkedCourses) {
      const normalized = normalizeTitle(title);
      coursesReferencedByYear.add(normalized);
    }
  }

  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Course) {
      continue;
    }
    if (coursesReferencedByYear.has(page.normalizedTitle)) {
      continue;
    }
    const diagnostic = courseWithoutYearLinkDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}
