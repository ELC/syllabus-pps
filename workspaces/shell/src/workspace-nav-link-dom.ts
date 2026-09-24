import { navIconSvg } from "./nav-icons";
import type { NavId } from "./site-root";

export function appendWorkspaceNavLink(
  root: HTMLElement,
  options: {
    navId: NavId;
    label: string;
    href?: string;
    disabled?: boolean;
    title?: string;
  },
): void {
  const disabled = options.disabled ?? !options.href;
  const classNames = disabled
    ? "pps-workspace-nav-link pps-workspace-nav-link--disabled"
    : "pps-workspace-nav-link";

  const iconHtml = `<span class="dashboard__link-icon">${navIconSvg(options.navId)}</span>`;
  const labelHtml = `<span class="pps-workspace-nav-link__label">${options.label}</span>`;

  if (!disabled && options.href) {
    const link = document.createElement("a");
    link.className = classNames;
    link.href = options.href;
    if (options.title) {
      link.title = options.title;
    }
    link.innerHTML = iconHtml + labelHtml;
    root.appendChild(link);
    return;
  }

  const span = document.createElement("span");
  span.className = classNames;
  span.setAttribute("aria-disabled", "true");
  if (options.title) {
    span.title = options.title;
  }
  span.innerHTML = iconHtml + labelHtml;
  root.appendChild(span);
}
