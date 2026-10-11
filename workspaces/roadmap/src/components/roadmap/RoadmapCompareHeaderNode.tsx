import type { NodeProps } from "@xyflow/react";

import { compareSectionWidthForColumn } from "./build-compare-flow";
import type { RoadmapCompareHeaderNodeData } from "./build-compare-flow";

export function RoadmapCompareHeaderNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapCompareHeaderNodeData;
  const width = nodeData.sectionWidth ?? compareSectionWidthForColumn("left", undefined);

  return (
    <div className="roadmap__compare-header" style={{ width }}>
      <p className="roadmap__compare-header-title">{nodeData.label}</p>
    </div>
  );
}
