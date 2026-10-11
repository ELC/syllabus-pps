import type { NodeProps } from "@xyflow/react";

import { compareSectionWidthForColumn } from "./build-compare-flow";
import type { RoadmapCompareColumnBgNodeData } from "./build-compare-flow";

export function RoadmapCompareColumnBgNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapCompareColumnBgNodeData;
  const width = nodeData.sectionWidth ?? compareSectionWidthForColumn(nodeData.column);

  return (
    <div
      className={[
        "roadmap__compare-column-bg",
        `roadmap__compare-column-bg--${nodeData.column}`,
      ].join(" ")}
      style={{ width, height: nodeData.height }}
      aria-hidden="true"
    />
  );
}
