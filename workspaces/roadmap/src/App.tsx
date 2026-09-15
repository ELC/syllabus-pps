import { useCallback, useEffect, useMemo, useRef } from "react";

import { RoadmapApp } from "./components/roadmap/RoadmapApp";
import type { RoadmapProgress } from "./components/roadmap/progress";
import {
  mountCapstonePanel,
  type CapstoneProject,
} from "./scripts/capstone-panel";
import {
  mountConceptPanel,
  type ConceptPage,
  type ConceptPanelProgress,
} from "./scripts/concept-panel";
import { readRoadmapPanelUrl, writeRoadmapPanelUrl } from "./scripts/roadmap-panel-url";
import { defaultCurriculumUrl } from "./site-base";

interface AppProps {
  dataUrl?: string;
}

export function App({ dataUrl }: AppProps) {
  const resolvedUrl = dataUrl ?? defaultCurriculumUrl();
  const conceptPanelRef = useRef<HTMLElement>(null);
  const capstonePanelRef = useRef<HTMLElement>(null);
  const conceptPanelControllerRef = useRef<ReturnType<typeof mountConceptPanel> | null>(null);
  const capstonePanelControllerRef = useRef<ReturnType<typeof mountCapstonePanel> | null>(null);
  const panelUrlSyncRef = useRef<{ markApplied: (state: ReturnType<typeof readRoadmapPanelUrl>) => void } | null>(
    null,
  );
  const progressRef = useRef<RoadmapProgress | null>(null);

  const handleConceptPanelUrlClose = useCallback(() => {
    const url = readRoadmapPanelUrl();
    if (!url.concept) {
      return;
    }

    const next = { career: url.career, capstone: url.capstone };
    writeRoadmapPanelUrl(next);
    panelUrlSyncRef.current?.markApplied(next);
  }, []);

  const handleCapstonePanelUrlClose = useCallback(() => {
    const url = readRoadmapPanelUrl();
    if (!url.capstone) {
      return;
    }

    const next = { career: url.career, concept: url.concept };
    writeRoadmapPanelUrl(next);
    panelUrlSyncRef.current?.markApplied(next);
  }, []);

  const handleClosePanels = useCallback(() => {
    conceptPanelControllerRef.current?.close({ updateUrl: false });
    capstonePanelControllerRef.current?.close({ updateUrl: false });
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
    const capstoneRoot = capstonePanelRef.current;
    if (!conceptRoot || !capstoneRoot) {
      return;
    }

    const conceptPanel = mountConceptPanel(conceptRoot, panelProgress, {
      onClose: handleConceptPanelUrlClose,
    });
    const capstonePanel = mountCapstonePanel(capstoneRoot, {
      onClose: handleCapstonePanelUrlClose,
    });
    conceptPanelControllerRef.current = conceptPanel;
    capstonePanelControllerRef.current = capstonePanel;

    return () => {
      conceptPanelControllerRef.current = null;
      capstonePanelControllerRef.current = null;
    };
  }, [handleCapstonePanelUrlClose, handleConceptPanelUrlClose, panelProgress]);

  const handleConceptOpen = useCallback((page: ConceptPage) => {
    capstonePanelControllerRef.current?.close({ updateUrl: false });
    conceptPanelControllerRef.current?.open(page);
  }, []);

  const handleCapstoneOpen = useCallback((capstone: CapstoneProject) => {
    conceptPanelControllerRef.current?.close({ updateUrl: false });
    capstonePanelControllerRef.current?.open(capstone);
  }, []);

  const handleProgressChange = useCallback((progress: RoadmapProgress) => {
    progressRef.current = progress;
    conceptPanelControllerRef.current?.refresh();
  }, []);

  return (
    <div className="dashboard__content">
      <header className="dashboard__header">
        <h1 className="dashboard__header-title">Degree roadmaps</h1>
        <p className="dashboard__header-lead dashboard__header-lead--wide">
          Self-paced learning paths built from concept prerequisites. Follow the main track from top
          to bottom, branch out into the related topics of each stage, and mark resources as you go.
        </p>
      </header>

      <section className="roadmap__shell">
        <RoadmapApp
          dataUrl={resolvedUrl}
          onConceptOpen={handleConceptOpen}
          onCapstoneOpen={handleCapstoneOpen}
          onClosePanels={handleClosePanels}
          onProgressChange={handleProgressChange}
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
            <h2 id="graph-concept-panel-title" className="graph__concept-title" />
            <button type="button" className="graph__concept-close" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div id="graph-concept-panel-notes" className="graph__concept-body" />
        </div>
      </aside>

      <aside
        ref={capstonePanelRef}
        id="roadmap-capstone-panel"
        className="graph__capstone-panel"
        aria-hidden="true"
      >
        <div className="graph__capstone-backdrop" />
        <div
          className="graph__capstone-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="graph-capstone-panel-title"
        >
          <header className="graph__capstone-header">
            <h2 id="graph-capstone-panel-title" className="graph__capstone-title" />
            <button type="button" className="graph__capstone-close" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div id="graph-capstone-panel-body" className="graph__capstone-body" />
        </div>
      </aside>
    </div>
  );
}
