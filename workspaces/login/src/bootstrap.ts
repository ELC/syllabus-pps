import type { User } from "@supabase/supabase-js";
import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { isAuthDisabled, readDevAuthProfile } from "./authDisabled";
import {
  handleUnauthenticatedAccess,
  maybeReturnAfterLogin,
  redirectSubsiteToLoginIfNeeded,
} from "./authRedirect";
import { readBrowserSession } from "./authSession";
import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig } from "./config";
import { LoginForm } from "./LoginForm";
import { LoginScreen } from "./LoginScreen";
import {
  applyAppAdminShellAccess,
  applyDevAdminShellAccess,
  markAppAdminAccessPending,
  resetAppAdminCache,
} from "./resolveAppAdmin";
import {
  activateSidebarFooter,
  clearLoginMount,
  hideShellForGuest,
  mountAuthLoading,
  revealAuthenticatedShell,
  setAuthPending,
} from "./shell-dom";
import { hasPersistedSupabaseSession } from "./sessionStorage";
import { readUserDisplayName } from "./userProfile";

export async function bootstrapAuthenticatedApp(
  host: HTMLElement,
  renderApp: (root: Root) => void,
): Promise<void> {
  if (redirectSubsiteToLoginIfNeeded()) {
    return;
  }

  if (isAuthDisabled()) {
    revealAuthenticatedShell();
    applyDevAdminShellAccess();
    const appRoot = createRoot(host);
    renderApp(appRoot);
    activateSidebarFooter(readDevAuthProfile(), async () => undefined);
    return;
  }

  const config = readSupabaseConfig();
  const optimisticAuth = hasPersistedSupabaseSession();
  if (optimisticAuth) {
    document.documentElement.classList.add("auth-session-cached");
    markAppAdminAccessPending();
    revealAuthenticatedShell();
  } else {
    setAuthPending(true);
    mountAuthLoading(host);
  }

  if (isMissingConfig(config)) {
    if (handleUnauthenticatedAccess() === "redirecting") {
      return;
    }
    hideShellForGuest();
    mountLogin(host, config.message);
    return;
  }

  const client = createBrowserClient(config);
  let cleanupSignOut: () => void = () => undefined;
  let appRoot: Root | null = null;
  let loginRoot: Root | null = null;
  let mountedUserId: string | null = null;

  async function showGuest(): Promise<void> {
    if (handleUnauthenticatedAccess() === "redirecting") {
      return;
    }

    resetAppAdminCache();
    mountedUserId = null;
    hideShellForGuest();
    cleanupSignOut();
    cleanupSignOut = () => undefined;
    if (appRoot) {
      appRoot.unmount();
      appRoot = null;
    }
    if (loginRoot) {
      loginRoot.unmount();
      loginRoot = null;
    }
    clearLoginMount(host);
    host.innerHTML = "";
    loginRoot = mountLogin(host);
  }

  async function showAuthenticated(user: User): Promise<void> {
    if (mountedUserId === user.id && appRoot) {
      return;
    }

    const isAdmin = await applyAppAdminShellAccess(client);
    maybeReturnAfterLogin({ isAdmin });
    revealAuthenticatedShell();
    if (loginRoot) {
      loginRoot.unmount();
      loginRoot = null;
    }
    clearLoginMount(host);
    if (!appRoot) {
      appRoot = createRoot(host);
      renderApp(appRoot);
    }
    mountedUserId = user.id;
    cleanupSignOut = activateSidebarFooter(
      {
        email: user.email ?? "",
        userName: readUserDisplayName(user),
      },
      async () => {
        await client.auth.signOut();
      },
    );
  }

  const session = await readBrowserSession(client);
  if (session) {
    await showAuthenticated(session.user);
  } else {
    await showGuest();
  }

  client.auth.onAuthStateChange((_event, session) => {
    if (session) {
      void showAuthenticated(session.user);
      return;
    }
    void showGuest();
  });
}

function mountLogin(host: HTMLElement, configMessage?: string): Root {
  host.querySelector(".login__auth-loading")?.remove();
  const mount = document.createElement("div");
  mount.className = "login__mount";
  host.appendChild(mount);
  const root = createRoot(mount);
  root.render(
    createElement(
      StrictMode,
      null,
      configMessage ? createElement(ConfigErrorPanel, { message: configMessage }) : createElement(LoginForm),
    ),
  );
  return root;
}

function ConfigErrorPanel({ message }: { message: string }) {
  return createElement(
    LoginScreen,
    null,
    createElement("h1", { className: "login__title" }, "Configuration required"),
    createElement("p", { className: "login__error", role: "alert" }, message),
  );
}
