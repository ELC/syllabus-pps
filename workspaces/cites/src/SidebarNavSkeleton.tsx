import type { ReactElement } from "react";

const MIN_ROWS = 4;
const MAX_ROWS = 20;

export function SidebarNavSkeleton({ rows }: { rows: number }): ReactElement {
  const count = Math.min(Math.max(rows, MIN_ROWS), MAX_ROWS);

  return (
    <div className="dashboard__sidebar-nav-skeleton" aria-hidden="true">
      <span className="u-visually-hidden">Cargando listado…</span>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="dashboard__sidebar-nav-skeleton-row" />
      ))}
    </div>
  );
}
