/** Keep in sync with ../src/nav.ts (compiled into integration dist for static shell HTML). */

import type { StaticNavId } from "./nav-icons.js";

export interface NavItem {
  id: StaticNavId;
  label: string;
  segment: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", segment: "" },
  { id: "analytics", label: "Analytics", segment: "analytics/" },
  { id: "network", label: "Network", segment: "network/" },
  { id: "roadmap", label: "Roadmaps", segment: "roadmap/" },
  { id: "planning", label: "Programa", segment: "planning/" },
  { id: "cms", label: "Contenido", segment: "cms/" },
  { id: "cites", label: "Recursos", segment: "cites/" },
  { id: "users", label: "Usuarios", segment: "users/" },
];

export function navHref(siteRoot: string, segment: string): string {
  return `${siteRoot}${segment}`;
}
