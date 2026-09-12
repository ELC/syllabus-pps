import { useEffect, useState, type ReactNode } from "react";

import {
  handleUnauthenticatedAccess,
  maybeReturnAfterLogin,
  redirectSubsiteToLoginIfNeeded,
} from "./authRedirect";
import { LoginForm } from "./LoginForm";
import { useAuthSession } from "./useAuthSession";

interface ShellAuthGateProps {
  children: ReactNode;
  logoUrl: string;
  siteRoot: string;
  renderShell: (props: {
    children: ReactNode;
    userEmail: string | null;
    userName: string | null;
    onSignOut: () => Promise<void>;
  }) => ReactNode;
}

export function ShellAuthGate({ children, logoUrl, siteRoot, renderShell }: ShellAuthGateProps) {
  const { status, session, displayName, signOut } = useAuthSession();
  const [redirecting, setRedirecting] = useState(() => redirectSubsiteToLoginIfNeeded());

  useEffect(() => {
    if (status === "authenticated") {
      maybeReturnAfterLogin();
      return;
    }

    if (status === "unauthenticated" || status === "misconfigured") {
      if (handleUnauthenticatedAccess() === "redirecting") {
        setRedirecting(true);
      }
    }
  }, [status]);

  if (redirecting) {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="login-main-only">
        <p className="login-auth-loading login-lead">Checking login…</p>
      </div>
    );
  }

  if (status === "misconfigured" || status === "unauthenticated") {
    return (
      <div className="login-main-only">
        <LoginForm />
      </div>
    );
  }

  return renderShell({
    children,
    userEmail: session?.user?.email ?? null,
    userName: displayName,
    onSignOut: signOut,
  });
}
