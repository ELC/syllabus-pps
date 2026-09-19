import type { ReactNode } from "react";

import { ShellAuthGate } from "@pps/login/ShellAuthGate";

import { DashboardSidebar } from "./DashboardSidebar";
import { shellIsologoHref } from "./logo-meta";
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
  return (
    <div className="dashboard">
      <DashboardSidebar
        activeNav={activeNav}
        sidebarExtra={sidebarExtra}
        userEmail={userEmail}
        userName={userName}
        onSignOut={onSignOut}
      />
      <main className="dashboard__main">
        <div className="dashboard__content">{children}</div>
      </main>
    </div>
  );
}

export function SiteShell({ children, activeNav, sidebarExtra }: SiteShellProps) {
  const appBase = import.meta.env.BASE_URL ?? "/";
  const siteRoot = siteRootFromEnv(appBase);
  const logoUrl = shellIsologoHref(siteRoot);

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
