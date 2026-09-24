import type { DegreeRoadmapNodeTitle } from "../roadmap/titles";
import type { DegreeRoadmapData } from "./degree-roadmap";

export type { DegreeRoadmapNodeTitle } from "../roadmap/titles";

export interface DegreeRoadmapAdjacency {
  readonly nodeTitles: ReadonlySet<DegreeRoadmapNodeTitle>;
  prerequisites: Map<DegreeRoadmapNodeTitle, Set<DegreeRoadmapNodeTitle>>;
  nextSteps: Map<DegreeRoadmapNodeTitle, Set<DegreeRoadmapNodeTitle>>;
}

export function degreeRoadmapNodeTitles(roadmap: DegreeRoadmapData): DegreeRoadmapNodeTitle[] {
  return roadmap.concepts.map((concept) => concept.title);
}

export function buildDegreeRoadmapAdjacency(roadmap: DegreeRoadmapData): DegreeRoadmapAdjacency {
  const nodeTitles = new Set(degreeRoadmapNodeTitles(roadmap));
  const prerequisites = new Map<DegreeRoadmapNodeTitle, Set<DegreeRoadmapNodeTitle>>();
  const nextSteps = new Map<DegreeRoadmapNodeTitle, Set<DegreeRoadmapNodeTitle>>();

  for (const concept of roadmap.concepts) {
    prerequisites.set(concept.title, new Set());
    nextSteps.set(concept.title, new Set());
  }

  const connect = (source: DegreeRoadmapNodeTitle, target: DegreeRoadmapNodeTitle) => {
    if (source === target || !nodeTitles.has(source) || !nodeTitles.has(target)) {
      return;
    }

    prerequisites.get(target)?.add(source);
    nextSteps.get(source)?.add(target);
  };

  for (const concept of roadmap.concepts) {
    for (const prerequisite of concept.dependsOn) {
      connect(prerequisite, concept.title);
    }
  }

  for (const edge of roadmap.edges) {
    connect(edge.source, edge.target);
  }

  return { nodeTitles, prerequisites, nextSteps };
}

/**
 * Kahn layering. Nodes left over by a dependency cycle land in a final stage so that every
 * listed title reaches a stage.
 */
export function topologicalDegreeRoadmapStages(
  titles: readonly DegreeRoadmapNodeTitle[],
  adjacency: DegreeRoadmapAdjacency,
): DegreeRoadmapNodeTitle[][] {
  const stages: DegreeRoadmapNodeTitle[][] = [];
  const placed = new Set<DegreeRoadmapNodeTitle>();

  while (placed.size < titles.length) {
    const pending = titles.filter((title) => !placed.has(title));
    const frontier = pending.filter((title) =>
      [...(adjacency.prerequisites.get(title) ?? [])].every((prerequisite) =>
        placed.has(prerequisite),
      ),
    );

    const layer = frontier.length > 0 ? frontier : pending;
    stages.push(layer);
    for (const title of layer) {
      placed.add(title);
    }
  }

  return stages;
}
