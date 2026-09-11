import type { DegreeRoadmap } from "@pps/core";
import type { Edge, Node } from "@xyflow/react";

import { capitalizeWords } from "../../scripts/labels";
import { ROADMAP_END_ID, ROADMAP_START_ID } from "./constants";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";

function buildAdjacency(roadmap: DegreeRoadmap): {
  prerequisites: Map<string, Set<string>>;
  nextSteps: Map<string, Set<string>>;
} {
  const prerequisites = new Map<string, Set<string>>();
  const nextSteps = new Map<string, Set<string>>();

  for (const concept of roadmap.concepts) {
    prerequisites.set(concept.title, new Set(concept.dependsOn));
    for (const prerequisite of concept.dependsOn) {
      const next = nextSteps.get(prerequisite) ?? new Set<string>();
      next.add(concept.title);
      nextSteps.set(prerequisite, next);
    }
  }

  for (const edge of roadmap.edges) {
    const prereqs = prerequisites.get(edge.target) ?? new Set<string>();
    prereqs.add(edge.source);
    prerequisites.set(edge.target, prereqs);

    const next = nextSteps.get(edge.source) ?? new Set<string>();
    next.add(edge.target);
    nextSteps.set(edge.source, next);
  }

  return { prerequisites, nextSteps };
}

export function collectUpstream(
  prerequisites: Map<string, Set<string>>,
  title: string,
): Set<string> {
  const visited = new Set<string>();
  const queue = [...(prerequisites.get(title) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    queue.push(...(prerequisites.get(current) ?? []));
  }

  return visited;
}

export function buildRoadmapFlow(
  roadmap: DegreeRoadmap,
  focusTitle: string,
): { nodes: Node[]; edges: Edge[] } {
  const adjacency = buildAdjacency(roadmap);
  const focusUpstream = focusTitle
    ? collectUpstream(adjacency.prerequisites, focusTitle)
    : new Set<string>();
  const focusDownstream = focusTitle
    ? (adjacency.nextSteps.get(focusTitle) ?? new Set<string>())
    : new Set<string>();

  const roots = roadmap.concepts
    .filter((concept) => concept.dependsOn.length === 0)
    .map((concept) => concept.title);
  const leaves = roadmap.concepts
    .filter((concept) => (adjacency.nextSteps.get(concept.title)?.size ?? 0) === 0)
    .map((concept) => concept.title);

  const conceptNodes: Node<RoadmapTopicNodeData>[] = roadmap.concepts.map((concept) => ({
    id: concept.title,
    type: "roadmapTopic",
    data: {
      label: capitalizeWords(concept.title),
      state:
        concept.title === focusTitle
          ? "selected"
          : focusUpstream.has(concept.title)
            ? "prerequisite"
            : focusDownstream.has(concept.title)
              ? "next"
              : "default",
    },
    position: { x: 0, y: 0 },
  }));

  const anchorNodes: Node[] = [
    {
      id: ROADMAP_START_ID,
      type: "roadmapAnchor",
      selectable: false,
      data: { label: "Inicio", variant: "start" },
      position: { x: 0, y: 0 },
    },
    {
      id: ROADMAP_END_ID,
      type: "roadmapAnchor",
      selectable: false,
      data: { label: "Objetivo", variant: "end" },
      position: { x: 0, y: 0 },
    },
  ];

  const dependencyEdges: Edge[] = roadmap.edges.map((edge) => ({
    id: `${edge.source}->${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    className:
      focusTitle &&
      (edge.target === focusTitle ||
        focusUpstream.has(edge.source) ||
        focusDownstream.has(edge.target))
        ? "roadmap-edge roadmap-edge--active"
        : "roadmap-edge",
  }));

  const anchorEdges: Edge[] = [
    ...roots.map((title) => ({
      id: `${ROADMAP_START_ID}->${title}`,
      source: ROADMAP_START_ID,
      target: title,
      type: "smoothstep",
      className: "roadmap-edge roadmap-edge--anchor",
    })),
    ...leaves.map((title) => ({
      id: `${title}->${ROADMAP_END_ID}`,
      source: title,
      target: ROADMAP_END_ID,
      type: "smoothstep",
      className: "roadmap-edge roadmap-edge--anchor",
    })),
  ];

  return {
    nodes: [...anchorNodes, ...conceptNodes],
    edges: [...anchorEdges, ...dependencyEdges],
  };
}

export { buildAdjacency };
