import { useAppAdmin } from "@pps/login/AppAdminContext";
import { useMemo, useSyncExternalStore } from "react";

import { WorkspaceNavLink } from "@pps/shell/WorkspaceNavLink";
import {
  cmsCoursePageHref,
  networkCourseExpansionHref,
  networkDegreeExpansionHref,
  planningCoursePageHref,
} from "@pps/shell/workspace-links";
import { siteRootFromEnv } from "@pps/shell/site-root";

import {
  getRoadmapPanelUrlSnapshot,
  readRoadmapPanelUrl,
  subscribeRoadmapPanelUrl,
} from "./scripts/roadmap-panel-url";

export interface RoadmapWorkspaceNav {
  degreeSlug: string | null;
  courseSlug: string | null;
  /** Carrera dropdown is Todas (cross-app links omit `degree=`). */
  scopeAllCarreras: boolean;
}

export interface RoadmapHeaderWorkspaceLinksProps {
  nav: RoadmapWorkspaceNav | null;
}

/** Degree query param for cross-app links (omit when Carrera = Todas). */
export function degreeSlugForWorkspaceLinks(
  panelUrl: ReturnType<typeof readRoadmapPanelUrl>,
  nav: RoadmapWorkspaceNav | null,
): string {
  if (nav?.scopeAllCarreras) {
    return "";
  }
  return panelUrl.degree?.trim() || nav?.degreeSlug?.trim() || "";
}

export function RoadmapHeaderWorkspaceLinks({ nav }: RoadmapHeaderWorkspaceLinksProps) {
  const { isAdmin } = useAppAdmin();
  const siteRoot = useMemo(() => siteRootFromEnv(import.meta.env.BASE_URL ?? "/"), []);
  const panelUrlKey = useSyncExternalStore(
    subscribeRoadmapPanelUrl,
    getRoadmapPanelUrlSnapshot,
    getRoadmapPanelUrlSnapshot,
  );
  const panelUrl = useMemo(() => readRoadmapPanelUrl(), [panelUrlKey]);

  const courseSlug = panelUrl.course?.trim() || nav?.courseSlug?.trim() || "";
  const degreeSlug = degreeSlugForWorkspaceLinks(panelUrl, nav);

  if (courseSlug) {
    const networkHref = networkCourseExpansionHref(
      siteRoot,
      courseSlug,
      degreeSlug || undefined,
    );
    const planningHref = planningCoursePageHref(
      siteRoot,
      courseSlug,
      degreeSlug || undefined,
    );
    const cmsHref = isAdmin ? cmsCoursePageHref(siteRoot, courseSlug) : null;

    return (
      <div className="roadmap__header-workspace-links pps-workspace-nav-links">
        {cmsHref ? (
          <WorkspaceNavLink navId="cms" href={cmsHref}>
            Editar
          </WorkspaceNavLink>
        ) : null}
        <WorkspaceNavLink navId="planning" href={planningHref}>
          Programa
        </WorkspaceNavLink>
        <WorkspaceNavLink navId="network" href={networkHref}>
          Red
        </WorkspaceNavLink>
      </div>
    );
  }

  if (!degreeSlug) {
    return null;
  }

  const networkHref = networkDegreeExpansionHref(siteRoot, degreeSlug);
  const cmsHref = isAdmin ? cmsCoursePageHref(siteRoot, degreeSlug) : null;

  return (
    <div className="roadmap__header-workspace-links pps-workspace-nav-links">
      {cmsHref ? (
        <WorkspaceNavLink navId="cms" href={cmsHref}>
          Editar
        </WorkspaceNavLink>
      ) : null}
      <WorkspaceNavLink navId="network" href={networkHref}>
        Red
      </WorkspaceNavLink>
    </div>
  );
}
