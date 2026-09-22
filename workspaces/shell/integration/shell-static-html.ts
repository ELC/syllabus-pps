import { SHELL_SIDEBAR_FOOTER_HTML } from "@pps/login/sidebar-footer-html";
import {
  shellIsologoHref,
  shellLogoHref,
  SHELL_ISOLOGO_ALT,
  SHELL_ISOLOGO_HEIGHT,
  SHELL_ISOLOGO_WIDTH,
  SHELL_LOGO_HEIGHT,
  SHELL_LOGO_WIDTH,
} from "./logo-meta.js";
import { navIconSvg, navToggleIconSvg, sidebarCollapseIconSvg } from "./nav-icons.js";
import { NAV_ITEMS, navHref } from "./nav.js";

export interface StaticShellOptions {
  sidebarExtraId?: string;
  mainClass?: string;
  logoSrc?: string;
  isologoSrc?: string;
  authDisabled?: boolean;
}

export function renderAuthRedirectScript(siteRoot: string): string {
  const loginRoot = JSON.stringify(siteRoot);
  return `<script>
(function () {
  var root = ${loginRoot};
  var rootUrl = new URL(root, window.location.origin);
  var current = new URL(window.location.href);
  if (current.origin !== rootUrl.origin) return;
  var norm = function (path) { return path.replace(/\\/$/, "") || "/"; };
  if (norm(current.pathname) === norm(rootUrl.pathname)) return;
  for (var index = 0; index < localStorage.length; index += 1) {
    var key = localStorage.key(index);
    if (!key || key.indexOf("sb-") !== 0 || key.slice(-11) !== "-auth-token") continue;
    try {
      var value = JSON.parse(localStorage.getItem(key));
      if (value && (value.access_token || value.refresh_token)) return;
    } catch (error) {}
  }
  sessionStorage.setItem("pps-auth-next", window.location.href);
  window.location.replace(rootUrl.href);
})();
</script>`;
}

function renderSiteNavLinks(activeNav: string, siteRoot: string): string {
  return NAV_ITEMS.map((item) => {
    const active = item.id === activeNav;
    const className = active ? "dashboard__link dashboard__link--active" : "dashboard__link";
    const aria = active ? ' aria-current="page"' : "";
    return `<a class="${className}" href="${navHref(siteRoot, item.segment)}" data-pps-nav-id="${item.id}"${aria} title="${item.label}"><span class="dashboard__link-icon">${navIconSvg(item.id)}</span><span class="dashboard__link-label">${item.label}</span></a>`;
  }).join("");
}

export function renderStaticShell(
  activeNav: string,
  siteRoot: string,
  options: StaticShellOptions = {},
): string {
  const {
    sidebarExtraId,
    mainClass = "dashboard__main",
    logoSrc = shellLogoHref(siteRoot),
    isologoSrc = shellIsologoHref(siteRoot),
  } = options;
  const navLinks = renderSiteNavLinks(activeNav, siteRoot);

  const sidebarExtra = sidebarExtraId
    ? `\n    <div id="${sidebarExtraId}" class="dashboard__extra"></div>`
    : "";

  const authRedirect = options.authDisabled ? "" : renderAuthRedirectScript(siteRoot);

  return `${authRedirect}
<div class="dashboard auth-shell-prerender">
  <aside class="dashboard__sidebar">
    <div class="dashboard__sidebar-head">
      <a class="dashboard__brand" href="${siteRoot}" aria-label="Universidad Austral — PPS Curriculum">
        <img class="dashboard__brand-logo" data-pps-shell-logo src="${logoSrc}" alt="${SHELL_ISOLOGO_ALT}" width="${SHELL_LOGO_WIDTH}" height="${SHELL_LOGO_HEIGHT}" decoding="async" fetchpriority="high" />
        <img class="dashboard__brand-isologo" data-pps-shell-isologo src="${isologoSrc}" alt="" width="${SHELL_ISOLOGO_WIDTH}" height="${SHELL_ISOLOGO_HEIGHT}" decoding="async" aria-hidden="true" />
      </a>
    </div>
    <button type="button" class="dashboard__nav-toggle" aria-expanded="false" aria-controls="dashboard-mobile-nav" title="Abrir menú"><span class="dashboard__nav-toggle-icon">${navToggleIconSvg(false)}</span></button>
    <div id="dashboard-mobile-nav" class="dashboard__sidebar-drawer">
      <div class="dashboard__sidebar-drawer-panel">
        <nav id="dashboard-site-nav" class="dashboard__nav" aria-label="Site">
          ${navLinks}
        </nav>${sidebarExtra}
        ${SHELL_SIDEBAR_FOOTER_HTML}
      </div>
    </div>
  </aside>
  <button type="button" class="dashboard__sidebar-collapse" aria-expanded="true" aria-controls="dashboard-site-nav" title="Contraer barra lateral"><span class="dashboard__sidebar-collapse-icon">${sidebarCollapseIconSvg(false)}</span></button>
  <main class="${mainClass}"><div id="root" class="app-root"></div></main>
</div>`;
}
