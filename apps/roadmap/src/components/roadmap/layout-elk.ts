import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

const elk = new ELK();

export const ROADMAP_NODE_WIDTH = 220;
export const ROADMAP_NODE_HEIGHT = 56;
export const ROADMAP_ANCHOR_WIDTH = 128;
export const ROADMAP_ANCHOR_HEIGHT = 44;

function nodeDimensions(node: Node): { width: number; height: number } {
  if (node.type === "roadmapAnchor") {
    return { width: ROADMAP_ANCHOR_WIDTH, height: ROADMAP_ANCHOR_HEIGHT };
  }

  return { width: ROADMAP_NODE_WIDTH, height: ROADMAP_NODE_HEIGHT };
}

export async function layoutRoadmapElements(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  const layout = await elk.layout({
    id: "roadmap-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "88",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes.map((node) => ({
      id: node.id,
      ...nodeDimensions(node),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const positions = new Map(
    (layout.children ?? []).map((node) => {
      const layoutNode = node as { id: string; x?: number; y?: number };
      return [layoutNode.id, { x: layoutNode.x ?? 0, y: layoutNode.y ?? 0 }];
    }),
  );

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}
