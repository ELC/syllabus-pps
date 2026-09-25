import type { NodeProps } from "@xyflow/react";
import { cmsCoursePageHref } from "@pps/shell/workspace-links";
import { siteRootFromEnv } from "@pps/shell/site-root";

export type { RoadmapYearBandNodeData } from "./roadmap-node-data";
import type { RoadmapYearBandNodeData } from "./roadmap-node-data";

export function YearBandDecoration({ data }: { data: RoadmapYearBandNodeData }) {
  const yearPageSlug = data.yearPageSlug?.trim();
  const cmsHref = yearPageSlug
    ? cmsCoursePageHref(siteRootFromEnv(import.meta.env.BASE_URL ?? "/"), yearPageSlug)
    : null;
  const className = [
    "roadmap__year-band",
    data.showYearSeparator ? "roadmap__year-band--between-years" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={
        {
          "--roadmap-year-separator-top": `${data.separatorTop}px`,
        } as React.CSSProperties
      }
      aria-hidden={cmsHref ? undefined : "true"}
    >
      {cmsHref ? (
        <a
          className="roadmap__year-band-label roadmap__year-band-link"
          href={cmsHref}
          title={`Editar ${data.label} en el CMS`}
          aria-label={`Editar ${data.label} en el CMS`}
        >
          {data.label}
        </a>
      ) : (
        <span className="roadmap__year-band-label">{data.label}</span>
      )}
    </div>
  );
}

export function RoadmapYearBandNode({ data }: NodeProps) {
  const nodeData = data as unknown as RoadmapYearBandNodeData;
  return <YearBandDecoration data={nodeData} />;
}
