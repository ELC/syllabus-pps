import type { NodeProps } from "@xyflow/react";

export interface RoadmapYearBandNodeData extends Record<string, unknown> {
  label: string;
}

export function RoadmapYearBandNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapYearBandNodeData;

  return (
    <div className="roadmap__year-band" aria-hidden="true">
      <span className="roadmap__year-band-label">{nodeData.label}</span>
    </div>
  );
}
