import { useAppAdmin } from "@pps/login/AppAdminContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AnalyticsRebuildIndicator,
  type PpsStatusIndicatorOverride,
} from "@pps/shell/AnalyticsRebuildIndicator";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import { WorkspaceNavLink } from "@pps/shell/WorkspaceNavLink";
import { cmsCoursePageHref } from "@pps/shell/workspace-links";
import { siteRootFromEnv } from "@pps/shell/site-root";

import { RoadmapApp } from "./components/roadmap/RoadmapApp";
import {
  RoadmapHeaderWorkspaceLinks,
  type RoadmapWorkspaceNav,
} from "./RoadmapHeaderWorkspaceLinks";
import type { RoadmapProgress } from "./components/roadmap/progress";
import {
  mountConceptPanel,
  type ConceptPage,
  type ConceptPanelProgress,
} from "./scripts/concept-panel";
import { readRoadmapPanelUrl, writeRoadmapPanelUrl } from "./scripts/roadmap-panel-url";

export function App() {
  const { isAdmin } = useAppAdmin();
  const rebuildStatus = useAnalyticsRebuildStatus();
  const [roadmapLoading, setRoadmapLoading] = useState(true);
  const [gridLayoutSemaphore, setGridLayoutSemaphore] =
    useState<PpsStatusIndicatorOverride | null>(null);
  const [gridLayoutEditHint, setGridLayoutEditHint] = useState<string | null>(null);
  const [openConceptSlug, setOpenConceptSlug] = useState<string | null>(null);
  const [workspaceNav, setWorkspaceNav] = useState<RoadmapWorkspaceNav | null>(null);
  const handleWorkspaceNavChange = useCallback((nav: RoadmapWorkspaceNav | null) => {
    setWorkspaceNav((current) => {
      if (
        (current?.degreeSlug ?? null) === (nav?.degreeSlug ?? null) &&
        (current?.courseSlug ?? null) === (nav?.courseSlug ?? null)
      ) {
        return current;
      }
      return nav;
    });
  }, []);
  const siteRoot = useMemo(() => siteRootFromEnv(import.meta.env.BASE_URL ?? "/"), []);
  const conceptPanelRef = useRef<HTMLElement>(null);
  const conceptPanelControllerRef = useRef<ReturnType<typeof mountConceptPanel> | null>(null);
  const panelUrlSyncRef = useRef<{ markApplied: (state: ReturnType<typeof readRoadmapPanelUrl>) => void } | null>(
    null,
  );
  const progressRef = useRef<RoadmapProgress | null>(null);

  const handleConceptPanelUrlClose = useCallback(() => {
    setOpenConceptSlug(null);
    const url = readRoadmapPanelUrl();
    if (!url.concept) {
      return;
    }

    const next = { degree: url.degree, course: url.course };
    writeRoadmapPanelUrl(next);
    panelUrlSyncRef.current?.markApplied(next);
  }, []);

  const handleClosePanels = useCallback(() => {
    setOpenConceptSlug(null);
    conceptPanelControllerRef.current?.close({ updateUrl: false });
  }, []);

  const panelProgress = useMemo<ConceptPanelProgress>(
    () => ({
      resourceStatusFor: (slug, line) =>
        progressRef.current?.resourceStatusFor(slug, line) ?? "pending",
      toggleResourceDone: (slug, line) => {
        progressRef.current?.toggleResourceDone(slug, line);
      },
      toggleResourceSkipped: (slug, line) => {
        progressRef.current?.toggleResourceSkipped(slug, line);
      },
    }),
    [],
  );

  useEffect(() => {
    const conceptRoot = conceptPanelRef.current;
    if (!conceptRoot) {
      return;
    }

    const conceptPanel = mountConceptPanel(conceptRoot, panelProgress, {
      handlers: { onClose: handleConceptPanelUrlClose },
      showCitesEditLinks: isAdmin,
    });
    conceptPanelControllerRef.current = conceptPanel;

    return () => {
      conceptPanelControllerRef.current = null;
    };
  }, [handleConceptPanelUrlClose, isAdmin, panelProgress]);

  const handleConceptOpen = useCallback((page: ConceptPage) => {
    setOpenConceptSlug(page.slug);
    conceptPanelControllerRef.current?.open(page);
  }, []);

  const handleProgressChange = useCallback((progress: RoadmapProgress) => {
    progressRef.current = progress;
    conceptPanelControllerRef.current?.refresh();
  }, []);

  return (
    <div className="dashboard__content">
      <header className="dashboard__header">
        <div className="dashboard__header-top">
          <div className="dashboard__header-title-band">
            <div className="roadmap__header-title-row dashboard__header-title-row">
              <h1 className="dashboard__header-title">Degree roadmaps</h1>
              <div className="roadmap__header-status">
                <AnalyticsRebuildIndicator
                  status={rebuildStatus}
                  loading={roadmapLoading}
                  override={gridLayoutSemaphore}
                />
                {gridLayoutEditHint ? (
                  <p className="roadmap__grid-layout-hint">{gridLayoutEditHint}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="dashboard__header-lead-row">
            <p className="dashboard__header-lead">
              Explorá materias por año y correlativas. Abrí una materia para ver conceptos, recursos y
              tu avance.
            </p>
            <RoadmapHeaderWorkspaceLinks nav={workspaceNav} />
          </div>
        </div>
      </header>

      <section className="roadmap__shell">
        <RoadmapApp
          onConceptOpen={handleConceptOpen}
          onClosePanels={handleClosePanels}
          onProgressChange={handleProgressChange}
          onLoadingChange={setRoadmapLoading}
          onGridLayoutSemaphoreChange={setGridLayoutSemaphore}
          onGridLayoutEditHintChange={setGridLayoutEditHint}
          onWorkspaceNavChange={handleWorkspaceNavChange}
          onRegisterPanelUrlSync={(sync) => {
            panelUrlSyncRef.current = sync;
          }}
        />
      </section>

      <aside
        ref={conceptPanelRef}
        id="roadmap-concept-panel"
        className="graph__concept-panel"
        aria-hidden="true"
      >
        <div className="graph__concept-backdrop" />
        <div
          className="graph__concept-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="graph-concept-panel-title"
        >
          <header className="graph__concept-header">
            <div className="graph__concept-header-lead">
              <h2 id="graph-concept-panel-title" className="graph__concept-title" />
              {isAdmin && openConceptSlug ? (
                <WorkspaceNavLink
                  navId="cms"
                  href={cmsCoursePageHref(siteRoot, openConceptSlug)}
                >
                  Editar
                </WorkspaceNavLink>
              ) : null}
            </div>
            <button type="button" className="graph__concept-close" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div id="graph-concept-panel-notes" className="graph__concept-body" />
        </div>
      </aside>
    </div>
  );
}
