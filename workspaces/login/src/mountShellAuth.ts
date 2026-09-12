import type { User } from "@supabase/supabase-js";
import { createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  handleUnauthenticatedAccess,
  maybeReturnAfterLogin,
  redirectSubsiteToLoginIfNeeded,
} from "./authRedirect";
import { readBrowserSession } from "./authSession";
import { createBrowserClient } from "./client";
import { isMissingConfig, readSupabaseConfig } from "./config";
import { LoginForm } from "./LoginForm";
import {
  activateSidebarFooter,
  hideShellForGuest,
  mountAuthLoading,
  revealAuthenticatedShell,
  setAuthPending,
} from "./shell-dom";
import { hasPersistedSupabaseSession } from "./sessionStorage";
import { readUserDisplayName } from "./userProfile";

export async function mountShellAuth(): Promise<void> {
  if (redirectSubsiteToLoginIfNeeded()) {
    return;
  }

  const mainElement = document.querySelector(".dashboard-main");
  if (!(mainElement instanceof HTMLElement)) {
    return;
  }

  await runShellAuthGate(mainElement);
}

async function runShellAuthGate(dashboardMain: HTMLElement): Promise<void> {
  const config = readSupabaseConfig();
  const optimisticAuth = hasPersistedSupabaseSession();
  if (optimisticAuth) {
    document.documentElement.classList.add("auth-session-cached");
    revealAuthenticatedShell();
  } else {
    setAuthPending(true);
    mountAuthLoading(dashboardMain);
  }

  if (isMissingConfig(config)) {
    if (handleUnauthenticatedAccess() === "redirecting") {
      return;
    }
    hideShellForGuest();
    mountLoginPanel(dashboardMain, null, config.message);
    return;
  }

  const client = createBrowserClient(config);
  let cleanupSignOut: () => void = () => undefined;
  let loginRoot: Root | null = null;

  function clearLogin(): void {
    loginRoot?.unmount();
    loginRoot = null;
    dashboardMain.querySelector(".login-mount")?.remove();
    dashboardMain.querySelector(".login-auth-loading")?.remove();
  }

  async function showGuest(): Promise<void> {
    if (handleUnauthenticatedAccess() === "redirecting") {
      return;
    }

    hideShellForGuest();
    cleanupSignOut();
    cleanupSignOut = () => undefined;
    clearLogin();
    loginRoot = mountLoginPanel(dashboardMain, loginRoot);
  }

  async function showAuthenticated(user: User): Promise<void> {
    maybeReturnAfterLogin();
    revealAuthenticatedShell();
    clearLogin();
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

function mountLoginPanel(main: HTMLElement, existingRoot: Root | null, configMessage?: string): Root {
  existingRoot?.unmount();
  main.querySelector(".login-auth-loading")?.remove();

  const mount = document.createElement("div");
  mount.className = "login-mount";
  main.prepend(mount);
  const root = createRoot(mount);
  root.render(
    createElement(
      StrictMode,
      null,
      configMessage
        ? createElement(
            "div",
            { className: "login-panel" },
            createElement("h1", { className: "login-title" }, "Configuration required"),
            createElement("p", { className: "login-error", role: "alert" }, configMessage),
          )
        : createElement(LoginForm),
    ),
  );
  return root;
}
