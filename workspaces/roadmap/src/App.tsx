import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { RoadmapApp } from "./components/roadmap/RoadmapApp";
import { mountConceptPanel } from "./scripts/concept-panel";
import { defaultCurriculumUrl } from "./site-base";

interface AppProps {
  dataUrl?: string;
}

export function App({ dataUrl }: AppProps) {
  const resolvedUrl = dataUrl ?? defaultCurriculumUrl();
  const roadmapHostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    const host = roadmapHostRef.current;
    const panelRoot = panelRef.current;
    if (!host || !panelRoot) {
      return;
    }

    const conceptPanel = mountConceptPanel(panelRoot);
    const root = createRoot(host);
    reactRootRef.current = root;
    root.render(
      <RoadmapApp
        dataUrl={resolvedUrl}
        onConceptOpen={(page) => conceptPanel.open(page)}
      />,
    );

    return () => {
      root.unmount();
      reactRootRef.current = null;
    };
  }, [resolvedUrl]);

  return (
    <>
      <header className="dashboard-header">
        <h1>Degree roadmaps</h1>
        <p>
          Self-paced learning paths built from concept prerequisites. Follow the suggested route or
          explore freely; the outline lists each stage with its direct dependencies.
        </p>
      </header>

      <section className="roadmap-shell">
        <div ref={roadmapHostRef} id="roadmap-root" />
      </section>

      <aside
        ref={panelRef}
        id="roadmap-concept-panel"
        className="graph-concept-panel"
        aria-hidden="true"
      >
        <div className="graph-concept-panel-backdrop" />
        <div
          className="graph-concept-panel-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="graph-concept-panel-title"
        >
          <header className="graph-concept-panel-header">
            <h2 id="graph-concept-panel-title" />
            <button type="button" className="graph-concept-panel-close" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div id="graph-concept-panel-notes" className="graph-concept-panel-body" />
        </div>
      </aside>
    </>
  );
}
