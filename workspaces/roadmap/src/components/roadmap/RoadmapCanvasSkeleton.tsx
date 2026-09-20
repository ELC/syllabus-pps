const SKELETON_NODES = [
  { row: 1, col: 2, w: 1, h: 1 },
  { row: 1, col: 4, w: 1, h: 1 },
  { row: 2, col: 1, w: 1, h: 1 },
  { row: 2, col: 3, w: 1, h: 1 },
  { row: 2, col: 5, w: 1, h: 1 },
  { row: 3, col: 2, w: 1, h: 1 },
  { row: 3, col: 4, w: 1, h: 1 },
  { row: 4, col: 1, w: 1, h: 1 },
  { row: 4, col: 3, w: 2, h: 1 },
] as const;

export function RoadmapCanvasSkeleton() {
  return (
    <div
      className="roadmap__canvas-skeleton"
      role="status"
      aria-live="polite"
      aria-label="Cargando mapa de materias"
    >
      <div className="roadmap__canvas-skeleton-grid" aria-hidden="true">
        {SKELETON_NODES.map((node, index) => (
          <span
            key={index}
            className="roadmap__canvas-skeleton-node"
            style={{
              gridRow: node.row,
              gridColumn: `${node.col} / span ${node.w}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
