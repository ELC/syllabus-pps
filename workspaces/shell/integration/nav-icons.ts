/** Keep in sync with ../src/nav-icons.ts (compiled into integration dist for static shell HTML). */

export type StaticNavId = "home" | "analytics" | "network" | "roadmap" | "cms" | "cites";

const NAV_ICON_PATHS: Record<StaticNavId, string> = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5Z" />',
  analytics:
    '<path d="M6 20V10" /><path d="M12 20V4" /><path d="M18 20v-6" />',
  network:
    '<circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.2 7.6 10.8 15.8" /><path d="M15.2 15.8 17.8 7.6" /><path d="M8.5 6h7" />',
  roadmap:
    '<path d="M4 6h16" /><path d="M4 12h10" /><path d="M4 18h14" /><circle cx="18" cy="12" r="2" /><circle cx="20" cy="18" r="2" />',
  cms: '<path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8l-6-6Z" /><path d="M14 4v6h6" /><path d="M8 13h8" /><path d="M8 17h5" />',
  cites:
    '<path d="M7 4h8a2 2 0 0 1 2 2v13l-6-3-6 3V6a2 2 0 0 1 2-2Z" /><path d="M11 9h4" />',
};

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

export function navIconSvg(id: StaticNavId): string {
  return `<svg ${SVG_ATTRS} aria-hidden="true">${NAV_ICON_PATHS[id]}</svg>`;
}

export function sidebarCollapseIconSvg(_collapsed = false): string {
  const lines =
    '<line x1="8" y1="5" x2="8" y2="19" /><line x1="12" y1="5" x2="12" y2="19" /><line x1="16" y1="5" x2="16" y2="19" />';
  return `<svg ${SVG_ATTRS} aria-hidden="true">${lines}</svg>`;
}
