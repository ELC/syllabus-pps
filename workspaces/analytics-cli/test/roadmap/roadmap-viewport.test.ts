import { describe, expect, it } from "vitest";

import { verticalStretchToFillViewport } from "../../../roadmap/src/components/roadmap/course-layout";
import { viewportForRoadmapBounds } from "../../../roadmap/src/components/roadmap/roadmap-viewport";

describe("verticalStretchToFillViewport", () => {
  it("stretches when width is the limiting axis", () => {
    const bounds = { minX: 0, maxX: 2000, minY: 0, maxY: 500 };
    expect(verticalStretchToFillViewport(bounds, 800, 600, 48)).toBeGreaterThan(1);
  });

  it("does not stretch when height is the limiting axis", () => {
    const bounds = { minX: 0, maxX: 400, minY: 0, maxY: 2000 };
    expect(verticalStretchToFillViewport(bounds, 800, 600, 48)).toBe(1);
  });
});

describe("viewportForRoadmapBounds", () => {
  it("centers content and zooms to fit width and height", () => {
    const bounds = { minX: 0, maxX: 2000, minY: 0, maxY: 3000 };
    const viewport = viewportForRoadmapBounds(bounds, 800, 600, 48);

    expect(viewport.zoom).toBeLessThan(1);
    expect(viewport.x).toBeCloseTo(400 - 1000 * viewport.zoom, 5);
    expect(viewport.y).toBeCloseTo(300 - 1500 * viewport.zoom, 5);
  });
});
