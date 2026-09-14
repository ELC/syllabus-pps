import { useCallback, useEffect, useRef } from "react";

import { RoadmapApp } from "./components/roadmap/RoadmapApp";
import { mountConceptPanel, type ConceptPage } from "./scripts/concept-panel";
import { defaultCurriculumUrl } from "./site-base";

interface AppProps {
  dataUrl?: string;
}

export function App({ dataUrl }: AppProps) {
  const resolvedUrl = dataUrl ?? defaultCurriculumUrl();
  const panelRef = useRef<HTMLElement>(null);
  const conceptPanelRef = useRef<ReturnType<typeof mountConceptPanel> | null>(null);

  useEffect(() => {
    const panelRoot = panelRef.current;
    if (!panelRoot) {
      return;
    }

    const conceptPanel = mountConceptPanel(panelRoot);
    conceptPanelRef.current = conceptPanel;

    return () => {
      conceptPanelRef.current = null;
    };
  }, []);

  const handleConceptOpen = useCallback((page: ConceptPage) => {
    conceptPanelRef.current?.open(page);
  }, []);

  return (
    <div className="dashboard__content">
      <header className="dashboard__header">
        <h1 className="dashboard__header-title">Degree roadmaps</h1>
        <p className="dashboard__header-lead dashboard__header-lead--wide">
          Self-paced learning paths built from concept prerequisites. Follow the main track from top
          to bottom, branch out into the related topics of each stage, and tick off what you already
          know.
        </p>
      </header>

      <section className="roadmap__shell">
        <RoadmapApp dataUrl={resolvedUrl} onConceptOpen={handleConceptOpen} />
      </section>

      <aside
        ref={panelRef}
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
    </div>
  );
}
