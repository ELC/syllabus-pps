import { repairShellSignOutMarkup } from "@pps/login/sidebar-footer-html";

import { navToggleIconSvg, sidebarCollapseIconSvg } from "./nav-icons";

const STORAGE_KEY = "pps-shell-sidebar-collapsed";
const COLLAPSE_EVENT = "pps-sidebar-collapsed";
const MOBILE_NAV_MQ = "(max-width: 900px)";

const INTERACTIVE_SELECTOR =
  ".dashboard__link, .dashboard__brand, .dashboard__sidebar-collapse, .dashboard__nav-toggle, .login__sign-out";

function isMobileNav(): boolean {
  return window.matchMedia(MOBILE_NAV_MQ).matches;
}

function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures in private mode.
  }
}

function applyNavToggleIcon(toggle: HTMLButtonElement, open: boolean): void {
  const icon = toggle.querySelector<HTMLElement>(".dashboard__nav-toggle-icon");
  if (icon) {
    icon.innerHTML = navToggleIconSvg(open);
  }
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.title = open ? "Cerrar menú" : "Abrir menú";
}

export function applyMobileNavOpen(dashboard: HTMLElement, open: boolean): void {
  dashboard.classList.toggle("dashboard--mobile-nav-open", open);
  const toggle = dashboard.querySelector<HTMLButtonElement>(".dashboard__nav-toggle");
  if (toggle) {
    applyNavToggleIcon(toggle, open);
  }
}

export function applySidebarCollapsed(dashboard: HTMLElement, collapsed: boolean): void {
  if (isMobileNav()) {
    dashboard.classList.remove("dashboard--sidebar-collapsed");
    return;
  }

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
  if (!isMobileNav()) {
    persistSidebarCollapsed(collapsed);
  }
}

function setMobileNavOpen(dashboard: HTMLElement, open: boolean): void {
  applyMobileNavOpen(dashboard, open);
}

/** Keeps sign-out at the end of the mobile drawer (fixes stale prerender markup). */
function ensureMobileMenuStructure(sidebar: HTMLElement): void {
  const drawerPanel = sidebar.querySelector<HTMLElement>(".dashboard__sidebar-drawer-panel");
  if (!drawerPanel) {
    return;
  }

  const orphanedNav = sidebar.querySelector(":scope > #dashboard-site-nav");
  if (orphanedNav) {
    drawerPanel.insertBefore(orphanedNav, drawerPanel.firstChild);
  }

  const orphanedExtra = sidebar.querySelector(":scope > .dashboard__extra");
  if (orphanedExtra && !drawerPanel.contains(orphanedExtra)) {
    drawerPanel.appendChild(orphanedExtra);
  }

  const orphanedFooter = sidebar.querySelector(":scope > .dashboard__footer");
  if (orphanedFooter) {
    drawerPanel.appendChild(orphanedFooter);
  }

  const panelFooter = drawerPanel.querySelector(".dashboard__footer");
  if (panelFooter && panelFooter !== drawerPanel.lastElementChild) {
    drawerPanel.appendChild(panelFooter);
  }
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
  const collapseToggle = root.querySelector<HTMLButtonElement>(".dashboard__sidebar-collapse");
  const navToggle = root.querySelector<HTMLButtonElement>(".dashboard__nav-toggle");

  if (!dashboard || !sidebar || sidebar.dataset.ppsSidebarMounted === "1") {
    return;
  }

  sidebar.dataset.ppsSidebarMounted = "1";
  ensureMobileMenuStructure(sidebar);
  repairShellSignOutMarkup(sidebar);
  setSidebarCollapsed(dashboard, readSidebarCollapsedPreference());
  setMobileNavOpen(dashboard, false);
  enableSidebarTransitions(dashboard);

  collapseToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isMobileNav()) {
      return;
    }
    const collapsed = !dashboard.classList.contains("dashboard--sidebar-collapsed");
    setSidebarCollapsed(dashboard, collapsed);
  });

  navToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !dashboard.classList.contains("dashboard--mobile-nav-open");
    setMobileNavOpen(dashboard, open);
  });

  dashboard.addEventListener("click", (event) => {
    if (!isMobileNav() || !dashboard.classList.contains("dashboard--mobile-nav-open")) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest(".dashboard__sidebar")) {
      return;
    }
    setMobileNavOpen(dashboard, false);
  });

  sidebar.addEventListener("click", (event) => {
    if (isMobileNav()) {
      return;
    }

    if (!dashboard.classList.contains("dashboard--sidebar-collapsed")) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }

    setSidebarCollapsed(dashboard, false);
  });

  const siteNav = dashboard.querySelector("#dashboard-site-nav");
  siteNav?.addEventListener("click", (event) => {
    if (!isMobileNav()) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("a.dashboard__link")) {
      setMobileNavOpen(dashboard, false);
    }
  });

  const mobileQuery = window.matchMedia(MOBILE_NAV_MQ);
  const onViewportChange = () => {
    if (mobileQuery.matches) {
      setSidebarCollapsed(dashboard, false);
      setMobileNavOpen(dashboard, false);
    } else {
      setMobileNavOpen(dashboard, false);
      setSidebarCollapsed(dashboard, readSidebarCollapsedPreference());
    }
  };

  mobileQuery.addEventListener("change", onViewportChange);
  onViewportChange();
}
