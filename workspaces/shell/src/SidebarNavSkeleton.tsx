import type { ReactElement } from "react";

/** Extra rows at link height; the scroll area clips overflow while loading. */
const SKELETON_ROW_COUNT = 28;

export function SidebarNavSkeleton(): ReactElement {
  return (
    <div className="dashboard__sidebar-nav-skeleton dashboard__sidebar-nav-skeleton--fill" aria-hidden="true">
      <span className="u-visually-hidden">Cargando listado…</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <span key={index} className="dashboard__sidebar-nav-skeleton-row" />
      ))}
    </div>
  );
}
