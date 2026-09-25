import type { RoadmapBounds } from "./layout";

export const ROADMAP_VIEWPORT_PADDING = 48;

export function viewportForRoadmapBounds(
  bounds: RoadmapBounds,
  width: number,
  height: number,
  padding = ROADMAP_VIEWPORT_PADDING,
): { x: number; y: number; zoom: number } {
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const zoomX = (width - padding * 2) / contentWidth;
  const zoomY = (height - padding * 2) / contentHeight;
  const zoom = Math.min(1, zoomX, zoomY);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    x: width / 2 - centerX * zoom,
    y: height / 2 - centerY * zoom,
    zoom,
  };
}
