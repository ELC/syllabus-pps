import { NAV_ITEMS, type NavItem } from "./nav";
import type { NavId } from "./site-root";

const VIEWER_NAV_IDS = new Set<NavId>(["network", "roadmap", "planning"]);

export function navItemsForUser(isAdmin: boolean): NavItem[] {
  if (isAdmin) {
    return NAV_ITEMS;
  }
  return NAV_ITEMS.filter((item) => VIEWER_NAV_IDS.has(item.id));
}

/** Placeholder nav rows while admin role is unresolved (matches viewer nav count). */
export function navSkeletonItems(): NavItem[] {
  return navItemsForUser(false);
}
