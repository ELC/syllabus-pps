export function RoadmapToolbarSkeleton() {
  return (
    <div
      className="roadmap__toolbar roadmap__toolbar--loading"
      role="status"
      aria-live="polite"
      aria-label="Cargando controles del roadmap"
    >
      <div className="roadmap__toolbar-selectors" aria-hidden="true">
        <div className="roadmap__toolbar-skeleton-field">
          <span className="roadmap__toolbar-skeleton-label" />
          <span className="roadmap__toolbar-skeleton-control roadmap__toolbar-skeleton-control--degree" />
        </div>
        <div className="roadmap__toolbar-skeleton-field">
          <span className="roadmap__toolbar-skeleton-label" />
          <span className="roadmap__toolbar-skeleton-control roadmap__toolbar-skeleton-control--course" />
        </div>
      </div>
      <div className="roadmap__toolbar-skeleton-progress" aria-hidden="true">
        <div className="roadmap__toolbar-skeleton-progress-head">
          <span className="roadmap__toolbar-skeleton-label" />
          <span className="roadmap__toolbar-skeleton-progress-value" />
        </div>
        <span className="roadmap__toolbar-skeleton-track" />
        <div className="roadmap__toolbar-skeleton-progress-foot">
          <span className="roadmap__toolbar-skeleton-meta" />
          <span className="roadmap__toolbar-skeleton-reset" />
        </div>
      </div>
    </div>
  );
}
