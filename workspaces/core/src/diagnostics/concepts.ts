import { buildCurriculumIndexes, isSourceReference } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, PageKind } from "../types";

import {
  conceptLinksToNonConceptDiagnostic,
  conceptLowCourseCoverageDiagnostic,
  conceptMissingKindDiagnostic,
  conceptNoteWithoutLinkDiagnostic,
} from "./concepts-errors";

export function conceptMissingKind(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    if (page.declaredKind === PageKind.Concept) {
      continue;
    }
    const diagnostic = conceptMissingKindDiagnostic(page);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function conceptNotesWithoutLinks(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    for (const block of page.blocks) {
      const hasLinks =
        block.refs.length > 0 ||
        block.tags.length > 0 ||
        block.urls.length > 0 ||
        block.citations.length > 0;
      if (hasLinks) {
        continue;
      }
      const diagnostic = conceptNoteWithoutLinkDiagnostic(page, block);
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

export function conceptLowCourseCoverage(graph: CurriculumGraph): Diagnostic[] {
  const minimumCourses = 3;
  const indexes = buildCurriculumIndexes(graph);
  const pagesByTitle = indexes.pagesByTitle;
  const courseTitles = new Set(
    graph.pages.filter((page) => page.kind === PageKind.Course).map((page) => page.normalizedTitle),
  );
  const coursesByConcept = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    const normalizedSource = normalizeTitle(edge.source);
    if (!courseTitles.has(normalizedSource)) {
      continue;
    }

    const normalizedTarget = normalizeTitle(edge.target);
    const target = pagesByTitle.get(normalizedTarget);
    if (target?.kind !== PageKind.Concept) {
      continue;
    }

    const courses = coursesByConcept.get(target.normalizedTitle) ?? new Set<string>();
    courses.add(edge.source);
    coursesByConcept.set(target.normalizedTitle, courses);
  }

  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    const courses = coursesByConcept.get(page.normalizedTitle) ?? new Set<string>();
    const courseCount = courses.size;
    if (courseCount === 0 || courseCount >= minimumCourses) {
      continue;
    }
    const diagnostic = conceptLowCourseCoverageDiagnostic(page, courses);
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

export function conceptLinksToNonConceptPages(graph: CurriculumGraph): Diagnostic[] {
  const indexes = buildCurriculumIndexes(graph);
  const pagesByTitle = indexes.pagesByTitle;
  const reported = new Set<string>();
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== PageKind.Concept) {
      continue;
    }
    for (const block of page.blocks) {
      for (const ref of block.refs) {
        const refTarget = ref.resolvedTarget ?? ref.target;
        const target = normalizeTitle(refTarget);
        const targetPage = pagesByTitle.get(target);
        if (targetPage?.kind === PageKind.Concept) {
          continue;
        }

        if (isSourceReference(page, block, targetPage, target)) {
          continue;
        }

        const reportKey = `${page.normalizedTitle}->${target}`;
        if (reported.has(reportKey)) {
          continue;
        }
        reported.add(reportKey);

        const diagnostic = conceptLinksToNonConceptDiagnostic(page, block, ref, targetPage);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}
