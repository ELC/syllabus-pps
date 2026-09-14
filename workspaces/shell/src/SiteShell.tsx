import type { ReactNode } from "react";

import { ShellAuthGate } from "@pps/login/ShellAuthGate";
import { ShellSidebarFooter } from "@pps/login/ShellSidebarFooter";

import {
  SHELL_LOGO_ALT,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_WIDTH,
  shellLogoHref,
} from "./logo-meta";

import { NAV_ITEMS, navHref } from "./nav";
import type { NavId } from "./site-root";
import { siteRootFromEnv } from "./site-root";

import "./styles/shell.scss";
import "@pps/login/styles/login.scss";

interface SiteShellProps {
  children: ReactNode;
  activeNav: NavId;
  sidebarExtra?: ReactNode;
}

function AuthenticatedShell({
  children,
  activeNav,
  sidebarExtra,
  userEmail,
  userName,
  onSignOut,
}: SiteShellProps & {
  userEmail: string | null;
  userName: string | null;
  onSignOut: () => Promise<void>;
}) {
  const appBase = import.meta.env.BASE_URL ?? "/";
  const siteRoot = siteRootFromEnv(appBase);
  const logoUrl = shellLogoHref(siteRoot);

  return (
    <div className="dashboard">
      <aside className="dashboard__sidebar">
        <a className="dashboard__brand" href={siteRoot} aria-label="Universidad Austral — PPS Curriculum">
          <img
            className="dashboard__brand-logo"
            src={logoUrl}
            fetchPriority="high"
            alt={SHELL_LOGO_ALT}
            width={SHELL_LOGO_WIDTH}
            height={SHELL_LOGO_HEIGHT}
            decoding="async"
          />
        </a>
        <nav className="dashboard__nav" aria-label="Site">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              className={item.id === activeNav ? "dashboard__link dashboard__link--active" : "dashboard__link"}
              href={navHref(siteRoot, item.segment)}
              aria-current={item.id === activeNav ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {sidebarExtra}
        <ShellSidebarFooter email={userEmail} userName={userName} onSignOut={onSignOut} />
      </aside>
      <main className="dashboard__main">
        <div className="dashboard__content">{children}</div>
      </main>
    </div>
  );
}

export function SiteShell({ children, activeNav, sidebarExtra }: SiteShellProps) {
  const appBase = import.meta.env.BASE_URL ?? "/";
  const siteRoot = siteRootFromEnv(appBase);
  const logoUrl = shellLogoHref(siteRoot);

  return (
    <ShellAuthGate
      logoUrl={logoUrl}
      siteRoot={siteRoot}
      renderShell={({ children: authedChildren, userEmail, userName, onSignOut }) => (
        <AuthenticatedShell
          activeNav={activeNav}
          sidebarExtra={sidebarExtra}
          userEmail={userEmail}
          userName={userName}
          onSignOut={onSignOut}
        >
          {authedChildren}
        </AuthenticatedShell>
      )}
    >
      {children}
    </ShellAuthGate>
  );
}
