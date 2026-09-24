import type { CourseTrayecto } from "@pps/core";

import type { RoadmapRole } from "./layout";

export interface RoadmapAnchorNodeData extends Record<string, unknown> {
  label: string;
  variant: "start" | "end";
}

export interface RoadmapTopicNodeData extends Record<string, unknown> {
  label: string;
  role: RoadmapRole;
  stage: number;
  state: "default";
}

export interface RoadmapCourseNodeData extends Record<string, unknown> {
  label: string;
  year: string;
  role: RoadmapRole;
  stage: number;
  trayecto?: CourseTrayecto;
}

export interface RoadmapYearBandNodeData extends Record<string, unknown> {
  label: string;
  separatorTop: number;
  showYearSeparator: boolean;
}
