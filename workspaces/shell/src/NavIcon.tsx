import type { NavId } from "./site-root";
import { navIconSvg, navToggleIconSvg, sidebarCollapseIconSvg } from "./nav-icons";

export function NavIcon({ id }: { id: NavId }) {
  return <span className="dashboard__link-icon" dangerouslySetInnerHTML={{ __html: navIconSvg(id) }} />;
}

export function SidebarCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <span
      className="dashboard__sidebar-collapse-icon"
      dangerouslySetInnerHTML={{ __html: sidebarCollapseIconSvg(collapsed) }}
    />
  );
}

export function NavToggleIcon({ open }: { open: boolean }) {
  return (
    <span
      className="dashboard__nav-toggle-icon"
      dangerouslySetInnerHTML={{ __html: navToggleIconSvg(open) }}
    />
  );
}
