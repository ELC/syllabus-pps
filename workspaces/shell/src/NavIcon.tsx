import type { NavId } from "./site-root";
import { navIconSvg, sidebarCollapseIconSvg } from "./nav-icons";

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
