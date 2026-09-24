import type { ReactElement, ReactNode } from "react";

import { NavIcon } from "./NavIcon";
import type { NavId } from "./site-root";

export interface WorkspaceNavLinkProps {
  navId: NavId;
  children: ReactNode;
  href?: string | null;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function WorkspaceNavLink({
  navId,
  children,
  href,
  disabled = false,
  title,
  className,
}: WorkspaceNavLinkProps): ReactElement {
  const classNames = [
    "pps-workspace-nav-link",
    disabled ? "pps-workspace-nav-link--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <NavIcon id={navId} />
      <span className="pps-workspace-nav-link__label">{children}</span>
    </>
  );

  if (!disabled && href) {
    return (
      <a className={classNames} href={href} title={title}>
        {content}
      </a>
    );
  }

  return (
    <span className={classNames} aria-disabled="true" title={title}>
      {content}
    </span>
  );
}
