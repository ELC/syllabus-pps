import type { ReactNode } from "react";

import { siteBase } from "./site-base";

export type ActiveNav = "home" | "analytics" | "graph" | "roadmap" | "cms";

interface SiteShellProps {
  children: ReactNode;
  activeNav: ActiveNav;
  sidebarExtra?: ReactNode;
}

const NAV_ITEMS: Array<{ id: ActiveNav; label: string; path: string }> = [
  { id: "home", label: "Home", path: "" },
  { id: "analytics", label: "Analytics", path: "analytics/" },
  { id: "graph", label: "Graph explorer", path: "analytics/graph/" },
  { id: "roadmap", label: "Roadmaps", path: "roadmap/" },
  { id: "cms", label: "CMS", path: "cms/" },
];

export function SiteShell({ children, activeNav, sidebarExtra }: SiteShellProps) {
  const base = siteBase();

  return (
    <div className="dashboard-app">
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href={base} aria-label="Universidad Austral — PPS Curriculum">
          <img src={`${base}brand/logo-horizontal-blanco.png`} alt="Universidad Austral" />
        </a>
        <nav className="dashboard-nav" aria-label="Site">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              className={item.id === activeNav ? "nav-link active" : "nav-link"}
              href={`${base}${item.path}`}
              aria-current={item.id === activeNav ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {sidebarExtra}
        <div className="dashboard-sidebar-footer">PPS curriculum</div>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
