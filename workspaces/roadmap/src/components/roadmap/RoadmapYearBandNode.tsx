import type { NodeProps } from "@xyflow/react";

export interface RoadmapYearBandNodeData extends Record<string, unknown> {
  label: string;
  separatorTop: number;
  showYearSeparator: boolean;
}

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
