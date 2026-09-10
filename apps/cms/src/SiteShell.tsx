import type { ReactNode } from "react";
import { cmsBase, siteBase } from "./site-base";

interface SiteShellProps {
  children: ReactNode;
  sidebarExtra?: ReactNode;
}

export function SiteShell({ children, sidebarExtra }: SiteShellProps) {
  const base = siteBase();

  return (
    <div className="dashboard-app">
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href={base}>
          PPS
        </a>
        <nav className="dashboard-nav" aria-label="Site">
          <a className="nav-link" href={base}>
            Home
          </a>
          <a className="nav-link" href={`${base}analytics/`}>
            Analytics
          </a>
          <a className="nav-link" href={`${base}analytics/graph/`}>
            Graph explorer
          </a>
          <a className="nav-link active" href={cmsBase()} aria-current="page">
            CMS
          </a>
        </nav>
        {sidebarExtra}
        <div className="dashboard-sidebar-footer">PPS curriculum</div>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
