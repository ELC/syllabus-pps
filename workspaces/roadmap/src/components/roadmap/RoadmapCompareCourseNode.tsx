import { yearIndexFromDisplayLabel } from "@pps/core";
import { courseYearPresentation } from "@pps/shell/austral-tokens";
import type { NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";

import { courseLabelDensityClass, courseUsesDenseLabel } from "./course-label-style";
import type { RoadmapCompareCourseNodeData } from "./build-compare-flow";

export function RoadmapCompareCourseNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapCompareCourseNodeData;
  const isShared = nodeData.column === "center";
  const labelDensity = courseLabelDensityClass(nodeData.label);
  const denseLabel = courseUsesDenseLabel(nodeData.label);
  const yearIndex = yearIndexFromDisplayLabel(nodeData.year ?? "") ?? 1;
  const yearColors = isShared
    ? null
    : courseYearPresentation(yearIndex, { spine: false });

  const style = isShared
    ? undefined
    : ({
        "--roadmap-course-border": yearColors?.borderColor,
        "--roadmap-course-bg": yearColors?.backgroundColor,
      } as CSSProperties);

  const hoverTooltip = isShared ? nodeData.yearTooltip?.trim() : undefined;

  return (
    <div
      style={style}
      className={[
        "roadmap__course",
        "roadmap__course--compare",
        "nodrag",
        "nopan",
        isShared ? "roadmap__course--compare-shared" : "",
        hoverTooltip ? "roadmap__course--compare-tooltip" : "",
        denseLabel ? "roadmap__course--dense-label" : "",
      ].join(" ")}
      data-tooltip={hoverTooltip}
      tabIndex={hoverTooltip ? 0 : undefined}
      aria-label={
        hoverTooltip ? `${nodeData.label}. ${hoverTooltip}` : nodeData.label
      }
    >
      <span
        className={[
          "roadmap__course-label",
          labelDensity,
        ].join(" ")}
      >
        {nodeData.label}
      </span>
    </div>
  );
}
