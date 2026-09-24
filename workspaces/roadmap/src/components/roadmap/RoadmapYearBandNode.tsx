import type { NodeProps } from "@xyflow/react";

export type { RoadmapYearBandNodeData } from "./roadmap-node-data";
import type { RoadmapYearBandNodeData } from "./roadmap-node-data";

export function RoadmapYearBandNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapYearBandNodeData;
  const className = [
    "roadmap__year-band",
    nodeData.showYearSeparator ? "roadmap__year-band--between-years" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={
        {
          "--roadmap-year-separator-top": `${nodeData.separatorTop}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span className="roadmap__year-band-label">{nodeData.label}</span>
    </div>
  );
}
