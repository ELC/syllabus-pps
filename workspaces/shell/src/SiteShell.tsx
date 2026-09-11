import type { ReactNode } from "react";

import { NAV_ITEMS, navHref } from "./nav";
import type { NavId } from "./site-root";
import { shellLogoHref, siteRootFromEnv } from "./site-root";

interface SiteShellProps {
  children: ReactNode;
  activeNav: NavId;
  sidebarExtra?: ReactNode;
}

export function SiteShell({ children, activeNav, sidebarExtra }: SiteShellProps) {
  const appBase = import.meta.env.BASE_URL ?? "/";
  const siteRoot = siteRootFromEnv(appBase);
  const logoUrl = shellLogoHref(appBase);

  return (
    <div className="dashboard-app">
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href={siteRoot} aria-label="Universidad Austral — PPS Curriculum">
          <img src={logoUrl} alt="Universidad Austral" />
        </a>
        <nav className="dashboard-nav" aria-label="Site">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              className={item.id === activeNav ? "nav-link active" : "nav-link"}
              href={navHref(siteRoot, item.segment)}
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
