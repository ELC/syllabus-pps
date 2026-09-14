const NAV_ITEMS = [
  { id: "home", label: "Home", segment: "" },
  { id: "analytics", label: "Analytics", segment: "analytics/" },
  { id: "network", label: "Network", segment: "network/" },
  { id: "roadmap", label: "Roadmaps", segment: "roadmap/" },
  { id: "cms", label: "CMS", segment: "cms/" },
];

export interface StaticShellOptions {
  sidebarExtraId?: string;
  mainClass?: string;
  logoSrc?: string;
}

const SHELL_LOGO_WIDTH = 5000;
const SHELL_LOGO_HEIGHT = 1837;

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

export function renderStaticShell(
  activeNav: string,
  siteRoot: string,
  options: StaticShellOptions = {},
): string {
  const {
    sidebarExtraId,
    mainClass = "dashboard__main",
    logoSrc = "/assets/shell/logo-horizontal-blanco.png",
  } = options;
  const navLinks = NAV_ITEMS.map((item) => {
    const active = item.id === activeNav;
    const aria = active ? ' aria-current="page"' : "";
    const className = active ? "dashboard__link dashboard__link--active" : "dashboard__link";
    return `<a class="${className}" href="${siteRoot}${item.segment}"${aria}>${item.label}</a>`;
  }).join("");

  const sidebarExtra = sidebarExtraId
    ? `\n    <div id="${sidebarExtraId}" class="dashboard__extra"></div>`
    : "";

  return `${renderAuthRedirectScript(siteRoot)}
<div class="dashboard auth-shell-prerender">
  <aside class="dashboard__sidebar">
    <a class="dashboard__brand" href="${siteRoot}" aria-label="Universidad Austral — PPS Curriculum">
      <img class="dashboard__brand-logo" data-pps-shell-logo src="${logoSrc}" alt="Universidad Austral" width="${SHELL_LOGO_WIDTH}" height="${SHELL_LOGO_HEIGHT}" decoding="async" fetchpriority="high" />
    </a>
    <nav class="dashboard__nav" aria-label="Site">
      ${navLinks}
    </nav>${sidebarExtra}
    <div class="dashboard__footer">
      <div class="dashboard__user" aria-live="polite">
        <div class="dashboard__user-name" data-pps-user-name hidden>&nbsp;</div>
        <div class="dashboard__user-email" data-pps-user-email>&nbsp;</div>
      </div>
      <div class="dashboard__signout-slot">
        <button type="button" class="login__sign-out" data-pps-sign-out hidden>Sign out</button>
      </div>
    </div>
  </aside>
  <main class="${mainClass}"><div id="root" class="app-root"></div></main>
</div>`;
}
