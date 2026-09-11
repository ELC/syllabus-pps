const NAV_ITEMS = [
  { id: "home", label: "Home", segment: "" },
  { id: "analytics", label: "Analytics", segment: "analytics/" },
  { id: "network", label: "Network", segment: "network/" },
  { id: "roadmap", label: "Roadmaps", segment: "roadmap/" },
  { id: "cms", label: "CMS", segment: "cms/" },
];

export function shellLogoHref(siteRoot) {
  return `${siteRoot}assets/shell/logo-horizontal-blanco.png`;
}

export function renderStaticShell(activeNav, siteRoot, options = {}) {
  const { sidebarExtraId, mainClass = "dashboard-main" } = options;
  const navLinks = NAV_ITEMS.map((item) => {
    const active = item.id === activeNav;
    const aria = active ? ' aria-current="page"' : "";
    const className = active ? "nav-link active" : "nav-link";
    return `<a class="${className}" href="${siteRoot}${item.segment}"${aria}>${item.label}</a>`;
  }).join("");

  const sidebarExtra = sidebarExtraId
    ? `\n    <div id="${sidebarExtraId}" class="dashboard-sidebar-extra"></div>`
    : "";

  return `<div class="dashboard-app">
  <aside class="dashboard-sidebar">
    <a class="dashboard-brand" href="${siteRoot}" aria-label="Universidad Austral — PPS Curriculum">
      <img src="${shellLogoHref(siteRoot)}" alt="Universidad Austral" />
    </a>
    <nav class="dashboard-nav" aria-label="Site">
      ${navLinks}
    </nav>${sidebarExtra}
    <div class="dashboard-sidebar-footer">PPS curriculum</div>
  </aside>
  <main class="${mainClass}" id="root"></main>
</div>`;
}
