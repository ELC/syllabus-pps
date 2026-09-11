import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface RoadmapTopicNodeData extends Record<string, unknown> {
  label: string;
  state: "default" | "selected" | "prerequisite" | "next";
}

export function RoadmapTopicNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RoadmapTopicNodeData;
  const state = selected ? "selected" : nodeData.state;

  return (
    <div className={`roadmap-topic-node roadmap-topic-node--${state}`}>
      <Handle type="target" position={Position.Top} className="roadmap-topic-handle" />
      <span className="roadmap-topic-label">{nodeData.label}</span>
      <Handle type="source" position={Position.Bottom} className="roadmap-topic-handle" />
    </div>
  );
}
