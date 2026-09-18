import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph, GraphEdge, PageKind, ZettelPage } from "../types";

export interface DegreeRoadmapConcept {
  title: string;
  slug: string;
  dependsOn: string[];
}

export interface DegreeRoadmap {
  degree: string;
  degreeSlug: string;
  concepts: DegreeRoadmapConcept[];
  edges: GraphEdge[];
}

export function reachableFromDegree(graph: CurriculumGraph, degreeTitle: string): Set<string> {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const degreePage = pagesByTitle.get(normalizeTitle(degreeTitle));
  if (!degreePage || degreePage.kind !== "degree") {
    return new Set();
  }

  const reachable = new Set<string>([degreePage.title]);
  const queue = [degreePage.title];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const edge of graph.edges) {
      if (edge.kind !== "page-ref" && edge.kind !== "concept-tag") {
        continue;
      }

      if (edge.source !== current || reachable.has(edge.target)) {
        continue;
      }

      reachable.add(edge.target);
      queue.push(edge.target);
    }
  }

  return reachable;
}

function conceptsForDegree(reachable: Set<string>, graph: CurriculumGraph): ZettelPage[] {
  const titles = new Set(
    graph.pages
      .filter((page) => page.kind === "concept" && reachable.has(page.title))
      .map((page) => page.title),
  );

  return graph.pages
    .filter((page) => titles.has(page.title))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function listDegreePages(graph: CurriculumGraph): ZettelPage[] {
  return graph.pages
    .filter((page) => page.kind === "degree")
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function projectDegreeRoadmap(graph: CurriculumGraph, degreeTitle: string): DegreeRoadmap | null {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const degreePage = pagesByTitle.get(normalizeTitle(degreeTitle));
  if (!degreePage || degreePage.kind !== "degree") {
    return null;
  }

  const reachable = reachableFromDegree(graph, degreePage.title);
  const concepts = conceptsForDegree(reachable, graph);
  const conceptTitles = new Set(concepts.map((page) => page.title));

  const edges = graph.edges.filter(
    (edge) =>
      edge.kind === "concept-dependency" &&
      conceptTitles.has(edge.source) &&
      conceptTitles.has(edge.target),
  );

  return {
    degree: degreePage.title,
    degreeSlug: degreePage.slug,
    concepts: concepts.map((page) => ({
      title: page.title,
      slug: page.slug,
      dependsOn: uniqueSorted(
        (page.dependsOn ?? [])
          .map((dep) => dep.resolvedTarget ?? dep.target)
          .filter((title) => conceptTitles.has(title)),
      ),
    })),
    edges,
  };
}

export function projectAllDegreeRoadmaps(graph: CurriculumGraph): DegreeRoadmap[] {
  return listDegreePages(graph)
    .map((degreePage) => projectDegreeRoadmap(graph, degreePage.title))
    .filter((roadmap): roadmap is DegreeRoadmap => roadmap !== null);
}

export function kindRankForRoadmap(kind: PageKind): number {
  switch (kind) {
    case "degree":
      return 0;
    case "year":
      return 1;
    case "course":
      return 2;
    case "concept":
      return 3;
    default:
      return 4;
  }
}
