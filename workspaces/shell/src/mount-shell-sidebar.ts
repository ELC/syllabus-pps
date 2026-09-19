import { sidebarCollapseIconSvg } from "./nav-icons";

const STORAGE_KEY = "pps-shell-sidebar-collapsed";
const COLLAPSE_EVENT = "pps-sidebar-collapsed";

const INTERACTIVE_SELECTOR =
  ".dashboard__link, .dashboard__brand, .dashboard__sidebar-collapse, .login__sign-out";

function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function applySidebarCollapsed(dashboard: HTMLElement, collapsed: boolean): void {
  dashboard.classList.toggle("dashboard--sidebar-collapsed", collapsed);

  const toggle = dashboard.querySelector<HTMLButtonElement>(".dashboard__sidebar-collapse");
  if (toggle) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.title = collapsed ? "Expandir barra lateral" : "Contraer barra lateral";

    const icon = toggle.querySelector<HTMLElement>(".dashboard__sidebar-collapse-icon");
    if (icon) {
      icon.innerHTML = sidebarCollapseIconSvg(collapsed);
    }
  }

  dashboard.dispatchEvent(new CustomEvent(COLLAPSE_EVENT, { detail: { collapsed } }));
}

export function readSidebarCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setSidebarCollapsed(dashboard: HTMLElement, collapsed: boolean): void {
  applySidebarCollapsed(dashboard, collapsed);
  persistSidebarCollapsed(collapsed);
}

function enableSidebarTransitions(dashboard: HTMLElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      dashboard.classList.add("dashboard--sidebar-transitions");
    });
  });
}

export function mountShellSidebar(root: ParentNode = document): void {
  const dashboard = root.querySelector<HTMLElement>(".dashboard");
  const sidebar = root.querySelector<HTMLElement>(".dashboard__sidebar");
  const toggle = root.querySelector<HTMLButtonElement>(".dashboard__sidebar-collapse");

  if (!dashboard || !sidebar || !toggle || sidebar.dataset.ppsSidebarMounted === "1") {
    return;
  }

  sidebar.dataset.ppsSidebarMounted = "1";
  setSidebarCollapsed(dashboard, readSidebarCollapsedPreference());
  enableSidebarTransitions(dashboard);

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const collapsed = !dashboard.classList.contains("dashboard--sidebar-collapsed");
    setSidebarCollapsed(dashboard, collapsed);
  });

  sidebar.addEventListener("click", (event) => {
    if (!dashboard.classList.contains("dashboard--sidebar-collapsed")) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }

    setSidebarCollapsed(dashboard, false);
  });
}
