import type { NavId } from "./site-root";

export interface NavItem {
  id: NavId;
  label: string;
  segment: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", segment: "" },
  { id: "analytics", label: "Analytics", segment: "analytics/" },
  { id: "network", label: "Network", segment: "network/" },
  { id: "roadmap", label: "Roadmaps", segment: "roadmap/" },
  { id: "cms", label: "CMS", segment: "cms/" },
];

export function navHref(siteRoot: string, segment: string): string {
  return `${siteRoot}${segment}`;
}
