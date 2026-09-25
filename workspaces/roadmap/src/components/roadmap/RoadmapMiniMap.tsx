import { MiniMap, useInternalNode, type MiniMapNodeProps, type Node } from "@xyflow/react";
import { memo, type MouseEvent } from "react";

import { yearIndexFromDisplayLabel } from "@pps/core";
import { borderColorForYearIndex } from "@pps/shell/austral-tokens";

const MINIMAP_NODE_TYPES = new Set(["roadmapCourse", "roadmapTopic"]);

function minimapNodeColor(node: Node): string {
  if (node.type === "roadmapTopic") {
    return "var(--austral-ing-secondary, #7eb8e8)";
  }

  if (node.type === "roadmapCourse") {
    const yearLabel = typeof node.data.year === "string" ? node.data.year : "";
    const yearIndex = yearIndexFromDisplayLabel(yearLabel) ?? 1;
    return borderColorForYearIndex(yearIndex);
  }

  return "var(--dash-muted)";
}

const RoadmapMiniMapNode = memo(function RoadmapMiniMapNode(props: MiniMapNodeProps) {
  const internal = useInternalNode(props.id);
  const nodeType = internal?.type;

  if (!nodeType || !MINIMAP_NODE_TYPES.has(String(nodeType))) {
    return null;
  }

  return (
    <rect
      className={["react-flow__minimap-node", props.className].filter(Boolean).join(" ")}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      rx={props.borderRadius}
      ry={props.borderRadius}
      fill={props.color}
      stroke={props.strokeColor}
      strokeWidth={props.strokeWidth}
      shapeRendering={props.shapeRendering}
      onClick={
        props.onClick
          ? (event: MouseEvent<SVGRectElement>) => props.onClick?.(event, props.id)
          : undefined
      }
    />
  );
});

export function RoadmapMiniMap() {
  return (
    <MiniMap
      pannable
      zoomable
      className="roadmap__minimap"
      nodeStrokeWidth={0}
      nodeBorderRadius={6}
      nodeComponent={RoadmapMiniMapNode}
      nodeColor={(node) => minimapNodeColor(node)}
    />
  );
}
