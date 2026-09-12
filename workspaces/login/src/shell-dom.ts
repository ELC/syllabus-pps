const AUTH_PENDING_CLASS = "auth-pending";
const AUTH_GUEST_CLASS = "auth-guest";
const USER_NAME_SELECTOR = "[data-pps-user-name]";
const USER_EMAIL_SELECTOR = "[data-pps-user-email]";
const SIGN_OUT_SELECTOR = "[data-pps-sign-out]";

export interface SidebarUserProfile {
  email: string;
  userName: string | null;
}

export function setAuthPending(enabled: boolean): void {
  document.body.classList.toggle(AUTH_PENDING_CLASS, enabled);
}

export function setAuthGuest(enabled: boolean): void {
  document.body.classList.toggle(AUTH_GUEST_CLASS, enabled);
}

export function revealAuthenticatedShell(): void {
  setAuthPending(false);
  setAuthGuest(false);
}

export function hideShellForGuest(): void {
  document.documentElement.classList.remove("auth-session-cached");
  setAuthPending(true);
  setAuthGuest(true);
}

export function activateSidebarFooter(profile: SidebarUserProfile, onSignOut: () => void | Promise<void>): () => void {
  const userBlock = document.querySelector<HTMLElement>(".dashboard-sidebar-user");
  const nameEl = document.querySelector<HTMLElement>(USER_NAME_SELECTOR);
  const emailEl = document.querySelector<HTMLElement>(USER_EMAIL_SELECTOR);
  const button = document.querySelector<HTMLButtonElement>(SIGN_OUT_SELECTOR);
  const resolvedName = profile.userName?.trim() || null;

  if (nameEl) {
    if (resolvedName) {
      nameEl.textContent = resolvedName;
      nameEl.hidden = false;
    } else {
      nameEl.textContent = "\u00a0";
      nameEl.hidden = true;
    }
  }

  if (emailEl) {
    emailEl.textContent = profile.email;
  }

  userBlock?.classList.add("dashboard-sidebar-user-active");

  if (!button) {
    return () => clearSidebarFooter();
  }

  button.hidden = false;
  button.classList.add("login-sign-out-active");

  const handler = () => {
    void onSignOut();
  };
  button.addEventListener("click", handler);

  return () => {
    button.removeEventListener("click", handler);
    clearSidebarFooter();
  };
}

export function clearSidebarFooter(): void {
  const userBlock = document.querySelector<HTMLElement>(".dashboard-sidebar-user");
  const nameEl = document.querySelector<HTMLElement>(USER_NAME_SELECTOR);
  const emailEl = document.querySelector<HTMLElement>(USER_EMAIL_SELECTOR);
  const button = document.querySelector<HTMLButtonElement>(SIGN_OUT_SELECTOR);

  if (nameEl) {
    nameEl.textContent = "\u00a0";
    nameEl.hidden = true;
  }

  if (emailEl) {
    emailEl.textContent = "\u00a0";
  }

  userBlock?.classList.remove("dashboard-sidebar-user-active");

  if (button) {
    button.hidden = true;
    button.classList.remove("login-sign-out-active");
  }
}

export function clearLoginMount(host: HTMLElement): void {
  host.querySelector(".login-panel")?.remove();
  host.querySelector(".login-mount")?.remove();
  host.querySelector(".login-auth-loading")?.remove();
}

export function mountAuthLoading(host: HTMLElement, message = "Checking login…"): void {
  host.querySelector(".login-auth-loading")?.remove();
  const loading = document.createElement("p");
  loading.className = "login-auth-loading login-lead";
  loading.setAttribute("role", "status");
  loading.textContent = message;
  host.prepend(loading);
}
