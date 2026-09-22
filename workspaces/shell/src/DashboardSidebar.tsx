import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { ShellSidebarFooter } from "@pps/login/ShellSidebarFooter";

import { NavIcon, NavToggleIcon, SidebarCollapseIcon } from "./NavIcon";
import {
  SHELL_ISOLOGO_ALT,
  SHELL_ISOLOGO_HEIGHT,
  SHELL_ISOLOGO_WIDTH,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_WIDTH,
  shellIsologoHref,
  shellLogoHref,
} from "./logo-meta";
import { mountShellSidebar, readSidebarCollapsedPreference } from "./mount-shell-sidebar";
import { NAV_ITEMS, navHref } from "./nav";
import type { NavId } from "./site-root";
import { siteRootFromEnv } from "./site-root";

interface DashboardSidebarProps {
  activeNav: NavId;
  sidebarExtra?: ReactNode;
  userEmail: string | null;
  userName: string | null;
  onSignOut: () => Promise<void>;
}

export function DashboardSidebar({
  activeNav,
  sidebarExtra,
  userEmail,
  userName,
  onSignOut,
}: DashboardSidebarProps) {
  const siteRoot = siteRootFromEnv(import.meta.env.BASE_URL ?? "/");
  const logoHref = shellLogoHref(siteRoot);
  const isologoHref = shellIsologoHref(siteRoot);
  const [collapsed, setCollapsed] = useState(readSidebarCollapsedPreference);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    mountShellSidebar();
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard) {
      return;
    }

    const sync = () => {
      setCollapsed(dashboard.classList.contains("dashboard--sidebar-collapsed"));
      setMobileNavOpen(dashboard.classList.contains("dashboard--mobile-nav-open"));
    };

    sync();
    dashboard.addEventListener("pps-sidebar-collapsed", sync);
    const observer = new MutationObserver(sync);
    observer.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
    return () => {
      dashboard.removeEventListener("pps-sidebar-collapsed", sync);
      observer.disconnect();
    };
  }, []);

  return (
    <>
    <aside className="dashboard__sidebar">
      <div className="dashboard__sidebar-head">
        <a className="dashboard__brand" href={siteRoot} aria-label="Universidad Austral — PPS Curriculum">
          <img
            className="dashboard__brand-logo"
            data-pps-shell-logo
            src={logoHref}
            fetchPriority="high"
            alt={SHELL_ISOLOGO_ALT}
            width={SHELL_LOGO_WIDTH}
            height={SHELL_LOGO_HEIGHT}
            decoding="async"
          />
          <img
            className="dashboard__brand-isologo"
            data-pps-shell-isologo
            src={isologoHref}
            alt=""
            width={SHELL_ISOLOGO_WIDTH}
            height={SHELL_ISOLOGO_HEIGHT}
            decoding="async"
            aria-hidden="true"
          />
        </a>
      </div>
      <button
        type="button"
        className="dashboard__nav-toggle"
        aria-expanded={mobileNavOpen}
        aria-controls="dashboard-mobile-nav"
        title={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
      >
        <NavToggleIcon open={mobileNavOpen} />
      </button>
      <div id="dashboard-mobile-nav" className="dashboard__sidebar-drawer">
        <div className="dashboard__sidebar-drawer-panel">
          <nav id="dashboard-site-nav" className="dashboard__nav" aria-label="Site">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                className={item.id === activeNav ? "dashboard__link dashboard__link--active" : "dashboard__link"}
                href={navHref(siteRoot, item.segment)}
                aria-current={item.id === activeNav ? "page" : undefined}
                title={item.label}
              >
                <NavIcon id={item.id} />
                <span className="dashboard__link-label">{item.label}</span>
              </a>
            ))}
          </nav>
          {sidebarExtra}
          <ShellSidebarFooter email={userEmail} userName={userName} onSignOut={onSignOut} />
        </div>
      </div>
    </aside>
    <button
      type="button"
      className="dashboard__sidebar-collapse"
      aria-expanded={collapsed ? "false" : "true"}
      aria-controls="dashboard-site-nav"
      title={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
    >
      <SidebarCollapseIcon collapsed={collapsed} />
    </button>
  </>
  );
}
