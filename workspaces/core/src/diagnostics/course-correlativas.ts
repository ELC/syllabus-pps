import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic } from "../types";

export function courseCorrelativasDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.correlativas === undefined) {
      continue;
    }

    if (page.kind !== "course") {
      diagnostics.push({
        severity: "warning",
        code: "course-correlativas-on-non-course",
        message: `Page "${page.title}" declares correlativas but is not a course page.`,
        page: page.title,
      });
      continue;
    }

    if (page.correlativasInvalid) {
      diagnostics.push({
        severity: "error",
        code: "course-correlativas-invalid",
        message: `Course page "${page.title}" has a malformed correlativas frontmatter field; expected a list of course titles.`,
        page: page.title,
      });
      continue;
    }

    for (const correlativa of page.correlativas) {
      const resolved = correlativa.resolvedTarget ?? correlativa.target;
      const targetPage = pagesByTitle.get(normalizeTitle(resolved));

      if (normalizeTitle(resolved) === page.normalizedTitle) {
        diagnostics.push({
          severity: "error",
          code: "course-correlativas-self",
          message: `Course page "${page.title}" cannot list itself as a correlativa.`,
          page: page.title,
          details: { target: resolved },
        });
        continue;
      }

      if (!targetPage) {
        diagnostics.push({
          severity: "error",
          code: "course-correlativas-unresolved",
          message: `Course page "${page.title}" lists missing correlativa "${correlativa.target}".`,
          page: page.title,
          details: { target: correlativa.target },
        });
        continue;
      }

      if (targetPage.kind !== "course") {
        diagnostics.push({
          severity: "error",
          code: "course-correlativas-non-course",
          message: `Course page "${page.title}" lists non-course page "${targetPage.title}" as a correlativa.`,
          page: page.title,
          details: { target: targetPage.title, targetKind: targetPage.kind },
        });
      }
    }
  }

  return diagnostics;
}
