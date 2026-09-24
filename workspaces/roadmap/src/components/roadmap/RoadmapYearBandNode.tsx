import type { NodeProps } from "@xyflow/react";
import { cmsCoursePageHref } from "@pps/shell/workspace-links";
import { siteRootFromEnv } from "@pps/shell/site-root";

export type { RoadmapYearBandNodeData } from "./roadmap-node-data";
import type { RoadmapYearBandNodeData } from "./roadmap-node-data";

export function RoadmapYearBandNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapYearBandNodeData;
  const yearPageSlug = nodeData.yearPageSlug?.trim();
  const cmsHref = yearPageSlug
    ? cmsCoursePageHref(siteRootFromEnv(import.meta.env.BASE_URL ?? "/"), yearPageSlug)
    : null;
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
      aria-hidden={cmsHref ? undefined : "true"}
    >
      {cmsHref ? (
        <a
          className="roadmap__year-band-label roadmap__year-band-link"
          href={cmsHref}
          title={`Editar ${nodeData.label} en el CMS`}
          aria-label={`Editar ${nodeData.label} en el CMS`}
        >
          {nodeData.label}
        </a>
      ) : (
        <span className="roadmap__year-band-label">{nodeData.label}</span>
      )}
    </div>
  );
}
