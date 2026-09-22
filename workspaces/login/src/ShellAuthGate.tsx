import { useEffect, useState, type ReactNode } from "react";

import { isAuthDisabled, readDevAuthProfile } from "./authDisabled";
import { handleUnauthenticatedAccess, redirectSubsiteToLoginIfNeeded } from "./authRedirect";
import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig } from "./config";
import { LoginForm } from "./LoginForm";
import {
  applyAppAdminShellAccess,
  applyDevAdminShellAccess,
  hasCachedAppAdminForUser,
  markAppAdminRole,
  resetAppAdminCache,
} from "./resolveAppAdmin";
import { hasPersistedSupabaseSession } from "./sessionStorage";
import { useAuthSession } from "./useAuthSession";

interface ShellAuthGateProps {
  children: ReactNode;
  logoUrl: string;
  siteRoot: string;
  renderShell: (props: {
    children: ReactNode;
    userEmail: string | null;
    userName: string | null;
    isAdmin: boolean;
    navAccessPending: boolean;
    onSignOut: () => Promise<void>;
  }) => ReactNode;
}

export function ShellAuthGate({ children, siteRoot, renderShell }: ShellAuthGateProps) {
  const devAuthProfile = readDevAuthProfile();
  const { status, session, displayName, signOut } = useAuthSession();
  const [redirecting, setRedirecting] = useState(() => redirectSubsiteToLoginIfNeeded());
  const [isAdmin, setIsAdmin] = useState(() => isAuthDisabled());
  const [navAccessPending, setNavAccessPending] = useState(
    () => !isAuthDisabled() && hasPersistedSupabaseSession(),
  );
  const authDisabled = isAuthDisabled();

  useEffect(() => {
    if (status === "unauthenticated" || status === "misconfigured") {
      if (handleUnauthenticatedAccess() === "redirecting") {
        setRedirecting(true);
      }
    }
  }, [status]);

  useEffect(() => {
    if (authDisabled) {
      applyDevAdminShellAccess(siteRoot);
      setIsAdmin(true);
      setNavAccessPending(false);
      return;
    }

    if (status !== "authenticated" || !session?.user?.id) {
      resetAppAdminCache();
      markAppAdminRole(false);
      setIsAdmin(false);
      setNavAccessPending(false);
      return;
    }

    const config = readSupabaseConfig();
    if (isMissingConfig(config)) {
      return;
    }

    const userId = session.user.id;
    const cachedAdmin = hasCachedAppAdminForUser(userId);
    if (!cachedAdmin) {
      setNavAccessPending(true);
    }

    let cancelled = false;
    const client = createBrowserClient(config);

    void applyAppAdminShellAccess(client, siteRoot).then((admin) => {
      if (cancelled) {
        return;
      }
      setIsAdmin(admin);
      setNavAccessPending(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authDisabled, siteRoot, session?.user?.id, status]);

  if (authDisabled) {
    return renderShell({
      children,
      userEmail: devAuthProfile.email,
      userName: devAuthProfile.userName,
      isAdmin: true,
      navAccessPending: false,
      onSignOut: async () => undefined,
    });
  }

  if (redirecting) {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="login__main-only">
        <p className="login__auth-loading login__lead">Checking login…</p>
      </div>
    );
  }

  if (status === "misconfigured" || status === "unauthenticated") {
    return (
      <div className="login__main-only">
        <LoginForm />
      </div>
    );
  }

  return renderShell({
    children,
    userEmail: session?.user?.email ?? null,
    userName: displayName,
    isAdmin,
    navAccessPending,
    onSignOut: signOut,
  });
}
