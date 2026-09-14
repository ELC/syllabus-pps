import type { DegreeRoadmap } from "@pps/core";

export interface RoadmapAdjacency {
  prerequisites: Map<string, Set<string>>;
  nextSteps: Map<string, Set<string>>;
}

export function buildAdjacency(roadmap: DegreeRoadmap): RoadmapAdjacency {
  const inScope = new Set(roadmap.concepts.map((concept) => concept.title));
  const prerequisites = new Map<string, Set<string>>();
  const nextSteps = new Map<string, Set<string>>();

  for (const concept of roadmap.concepts) {
    prerequisites.set(concept.title, new Set());
    nextSteps.set(concept.title, new Set());
  }

  const connect = (source: string, target: string) => {
    if (source === target || !inScope.has(source) || !inScope.has(target)) {
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

  return { prerequisites, nextSteps };
}

function collectReachable(from: Map<string, Set<string>>, title: string): Set<string> {
  const visited = new Set<string>();
  const queue = [...(from.get(title) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === title || visited.has(current)) {
      continue;
    }

    visited.add(current);
    queue.push(...(from.get(current) ?? []));
  }

  return visited;
}

export function collectUpstream(
  prerequisites: Map<string, Set<string>>,
  title: string,
): Set<string> {
  return collectReachable(prerequisites, title);
}

export function countDescendants(nextSteps: Map<string, Set<string>>, title: string): number {
  return collectReachable(nextSteps, title).size;
}

/**
 * Splits concepts into independent dependency tracks: groups connected by prerequisites, with no
 * dependency crossing from one group to another.
 */
export function connectedTracks(titles: string[], adjacency: RoadmapAdjacency): string[][] {
  const assigned = new Set<string>();
  const tracks: string[][] = [];

  for (const title of titles) {
    if (assigned.has(title)) {
      continue;
    }

    const track: string[] = [];
    const queue = [title];
    assigned.add(title);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        continue;
      }

      track.push(current);

      const neighbours = [
        ...(adjacency.prerequisites.get(current) ?? []),
        ...(adjacency.nextSteps.get(current) ?? []),
      ];

      for (const neighbour of neighbours) {
        if (!assigned.has(neighbour)) {
          assigned.add(neighbour);
          queue.push(neighbour);
        }
      }
    }

    tracks.push(track);
  }

  return tracks;
}

/**
 * Kahn layering. Concepts left over by a dependency cycle land in a final stage so that every
 * concept reaches the canvas.
 */
export function topologicalStages(titles: string[], adjacency: RoadmapAdjacency): string[][] {
  const stages: string[][] = [];
  const placed = new Set<string>();

  while (placed.size < titles.length) {
    const pending = titles.filter((title) => !placed.has(title));
    const frontier = pending.filter((title) =>
      [...(adjacency.prerequisites.get(title) ?? [])].every((prerequisite) =>
        placed.has(prerequisite),
      ),
    );

    stages.push(frontier.length > 0 ? frontier : pending);
    for (const title of frontier.length > 0 ? frontier : pending) {
      placed.add(title);
    }
  }

  return stages;
}
