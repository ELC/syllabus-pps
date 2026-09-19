import {
  shellIsologoHref,
  shellLogoHref,
  SHELL_ISOLOGO_ALT,
  SHELL_ISOLOGO_HEIGHT,
  SHELL_ISOLOGO_WIDTH,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_WIDTH,
} from "./logo-meta";
import { navIconSvg, sidebarCollapseIconSvg } from "./nav-icons";
import { NAV_ITEMS, navHref } from "./nav";
import type { NavId } from "./site-root";

export function renderSiteNavLinks(activeNav: NavId, siteRoot: string): string {
  return NAV_ITEMS.map((item) => {
    const active = item.id === activeNav;
    const className = active ? "dashboard__link dashboard__link--active" : "dashboard__link";
    const aria = active ? ' aria-current="page"' : "";
    return `<a class="${className}" href="${navHref(siteRoot, item.segment)}"${aria} title="${item.label}"><span class="dashboard__link-icon">${navIconSvg(item.id)}</span><span class="dashboard__link-label">${item.label}</span></a>`;
  }).join("");
}

export function renderSidebarBrand(siteRoot: string): string {
  const logoHref = shellLogoHref(siteRoot);
  const isologoHref = shellIsologoHref(siteRoot);
  return `<a class="dashboard__brand" href="${siteRoot}" aria-label="Universidad Austral — PPS Curriculum">
      <img class="dashboard__brand-logo" data-pps-shell-logo src="${logoHref}" alt="${SHELL_ISOLOGO_ALT}" width="${SHELL_LOGO_WIDTH}" height="${SHELL_LOGO_HEIGHT}" decoding="async" fetchpriority="high" />
      <img class="dashboard__brand-isologo" data-pps-shell-isologo src="${isologoHref}" alt="" width="${SHELL_ISOLOGO_WIDTH}" height="${SHELL_ISOLOGO_HEIGHT}" decoding="async" aria-hidden="true" />
    </a>`;
}

export function renderSidebarHead(siteRoot: string): string {
  return `<div class="dashboard__sidebar-head">${renderSidebarBrand(siteRoot)}</div>`;
}

export function renderSidebarCollapseButton(collapsed = false): string {
  return `<button type="button" class="dashboard__sidebar-collapse" aria-expanded="${collapsed ? "false" : "true"}" aria-controls="dashboard-site-nav" title="${collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}"><span class="dashboard__sidebar-collapse-icon">${sidebarCollapseIconSvg(collapsed)}</span></button>`;
}
