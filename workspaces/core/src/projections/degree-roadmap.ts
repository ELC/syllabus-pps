import { buildCurriculumIndexes } from "../analysis";
import { normalizeTitle, uniqueSorted } from "../normalize";
import { CurriculumGraph, GraphEdge, PageKind, ZettelPage } from "../types";

export interface DegreeRoadmapConcept {
  title: string;
  slug: string;
  dependsOn: string[];
}

export interface DegreeRoadmap {
  career: string;
  careerSlug: string;
  concepts: DegreeRoadmapConcept[];
  edges: GraphEdge[];
}

function reachableFromCareer(graph: CurriculumGraph, careerTitle: string): Set<string> {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const career = pagesByTitle.get(normalizeTitle(careerTitle));
  if (!career || career.kind !== "career") {
    return new Set();
  }

  const reachable = new Set<string>([career.title]);
  const queue = [career.title];

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

export function listCareerPages(graph: CurriculumGraph): ZettelPage[] {
  return graph.pages
    .filter((page) => page.kind === "career")
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}

export function projectDegreeRoadmap(graph: CurriculumGraph, careerTitle: string): DegreeRoadmap | null {
  const { pagesByTitle } = buildCurriculumIndexes(graph);
  const career = pagesByTitle.get(normalizeTitle(careerTitle));
  if (!career || career.kind !== "career") {
    return null;
  }

  const reachable = reachableFromCareer(graph, career.title);
  const concepts = conceptsForDegree(reachable, graph);
  const conceptTitles = new Set(concepts.map((page) => page.title));

  const edges = graph.edges.filter(
    (edge) =>
      edge.kind === "concept-dependency" &&
      conceptTitles.has(edge.source) &&
      conceptTitles.has(edge.target),
  );

  return {
    career: career.title,
    careerSlug: career.slug,
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
  return listCareerPages(graph)
    .map((career) => projectDegreeRoadmap(graph, career.title))
    .filter((roadmap): roadmap is DegreeRoadmap => roadmap !== null);
}

export function kindRankForRoadmap(kind: PageKind): number {
  switch (kind) {
    case "career":
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
