import type { RefObject } from "react";

import { RoadmapCanvasSkeleton } from "./RoadmapCanvasSkeleton";
import { RoadmapToolbarSkeleton } from "./RoadmapToolbarSkeleton";

export function RoadmapLoadingShell({
  canvasPanelRef,
}: {
  canvasPanelRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <div className="roadmap">
      <RoadmapToolbarSkeleton />
      <section
        ref={canvasPanelRef}
        className="roadmap__canvas-panel roadmap__canvas-panel--booting"
        aria-busy="true"
        aria-label="Cargando mapa"
      >
        <RoadmapCanvasSkeleton />
      </section>
    </div>
  );
}
