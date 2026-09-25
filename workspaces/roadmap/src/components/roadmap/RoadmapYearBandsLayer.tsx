import { ViewportPortal } from "@xyflow/react";

import type { YearBandOverlay } from "./build-flow";
import { YearBandDecoration } from "./RoadmapYearBandNode";

export function RoadmapYearBandsLayer({ overlays }: { overlays: YearBandOverlay[] }) {
  if (overlays.length === 0) {
    return null;
  }

  return (
    <ViewportPortal>
      <div className="roadmap__year-bands-layer">
        {overlays.map((overlay) => (
          <div
            key={overlay.id}
            className="roadmap__year-band-host"
            style={{
              position: "absolute",
              left: overlay.x,
              top: overlay.y,
              width: overlay.width,
              height: overlay.height,
            }}
          >
            <YearBandDecoration data={overlay.data} />
          </div>
        ))}
      </div>
    </ViewportPortal>
  );
}
