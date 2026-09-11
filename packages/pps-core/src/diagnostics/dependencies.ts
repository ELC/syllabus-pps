import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle } from "../normalize";
import { CurriculumGraph, Diagnostic, ZettelPage } from "../types";

function prerequisiteTitle(
  pagesByTitle: ReadonlyMap<string, ZettelPage>,
  dep: NonNullable<ZettelPage["dependsOn"]>[number],
): string | undefined {
  const resolved = dep.resolvedTarget ?? dep.target;
  const page = pagesByTitle.get(normalizeTitle(resolved));
  return page?.title;
}

export function conceptDependsOnDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const { pagesByTitle, conceptPagesByTitle } = buildCurriculumIndexes(graph);
  const diagnostics: Diagnostic[] = [];

  for (const page of graph.pages) {
    if (page.kind !== "concept") {
      continue;
    }

    if (page.dependsOn === undefined) {
      diagnostics.push({
        severity: "error",
        code: "concept-missing-depends-on",
        message: `Concept page "${page.title}" must declare dependsOn in frontmatter (use [] for entry concepts).`,
        page: page.title,
      });
      continue;
    }

    if (page.dependsOnInvalid) {
      diagnostics.push({
        severity: "error",
        code: "concept-depends-on-invalid",
        message: `Concept page "${page.title}" has a malformed dependsOn frontmatter field; expected a list of concept titles.`,
        page: page.title,
      });
      continue;
    }

    for (const dep of page.dependsOn) {
      const resolved = dep.resolvedTarget ?? dep.target;
      const targetPage = pagesByTitle.get(normalizeTitle(resolved));

      if (normalizeTitle(resolved) === page.normalizedTitle) {
        diagnostics.push({
          severity: "error",
          code: "concept-depends-on-self",
          message: `Concept page "${page.title}" cannot depend on itself.`,
          page: page.title,
          details: { target: resolved },
        });
        continue;
      }

      if (!targetPage) {
        diagnostics.push({
          severity: "error",
          code: "concept-depends-on-unresolved",
          message: `Concept page "${page.title}" depends on missing page "${dep.target}".`,
          page: page.title,
          details: { target: dep.target },
        });
        continue;
      }

      if (targetPage.kind !== "concept") {
        diagnostics.push({
          severity: "error",
          code: "concept-depends-on-non-concept",
          message: `Concept page "${page.title}" depends on non-concept page "${targetPage.title}".`,
          page: page.title,
          details: { target: targetPage.title, targetKind: targetPage.kind },
        });
      }
    }
  }

  return diagnostics;
}

export function conceptDependsOnCycleDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const { conceptPagesByTitle } = buildCurriculumIndexes(graph);
  const adjacency = new Map<string, string[]>();

  for (const page of conceptPagesByTitle.values()) {
    const prerequisites = (page.dependsOn ?? [])
      .map((dep) => prerequisiteTitle(conceptPagesByTitle, dep))
      .filter((title): title is string => title !== undefined)
      .map((title) => normalizeTitle(title));

    adjacency.set(page.normalizedTitle, prerequisites);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleMembers = new Set<string>();

  function visit(node: string): void {
    if (visited.has(node)) {
      return;
    }

    if (visiting.has(node)) {
      cycleMembers.add(node);
      return;
    }

    visiting.add(node);
    for (const prerequisite of adjacency.get(node) ?? []) {
      visit(prerequisite);
      if (cycleMembers.has(prerequisite)) {
        cycleMembers.add(node);
      }
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of adjacency.keys()) {
    visit(node);
  }

  if (cycleMembers.size === 0) {
    return [];
  }

  const cycleTitles = [...conceptPagesByTitle.values()]
    .filter((page) => cycleMembers.has(page.normalizedTitle))
    .map((page) => page.title)
    .sort((left, right) => left.localeCompare(right, "es-AR"));

  return [
    {
      severity: "error",
      code: "concept-depends-on-cycle",
      message: `Concept dependency graph contains a cycle involving: ${cycleTitles.join(", ")}.`,
      details: { concepts: cycleTitles },
    },
  ];
}
