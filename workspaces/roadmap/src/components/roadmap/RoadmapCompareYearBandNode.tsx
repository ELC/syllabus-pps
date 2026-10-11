import type { NodeProps } from "@xyflow/react";

import { COMPARE_SIDE_SECTION_WIDTH, COMPARE_YEAR_BAND_HEIGHT } from "./build-compare-flow";
import type { RoadmapCompareYearBandNodeData } from "./build-compare-flow";

export function RoadmapCompareYearBandNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapCompareYearBandNodeData;
  const width = nodeData.sectionWidth ?? COMPARE_SIDE_SECTION_WIDTH;

  return (
    <div
      className={[
        "roadmap__compare-year-band",
        nodeData.showSeparator ? "roadmap__compare-year-band--separator" : "",
      ].join(" ")}
      style={{ width, height: COMPARE_YEAR_BAND_HEIGHT }}
    >
      <span className="roadmap__compare-year-band-label">{nodeData.label}</span>
    </div>
  );
}
