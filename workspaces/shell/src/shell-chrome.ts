import "@pps/login/styles/login.scss";

import { shellIsologoHref, shellLogoHref } from "./logo-meta";
import { mountShellSidebar } from "./mount-shell-sidebar";
import { siteRootFromEnv } from "./site-root";

import "./styles/shell.scss";

const siteRoot = siteRootFromEnv(import.meta.env.BASE_URL);

const brandLogo = document.querySelector<HTMLImageElement>("[data-pps-shell-logo]");
if (brandLogo && !brandLogo.getAttribute("src")) {
  brandLogo.src = shellLogoHref(siteRoot);
}

const brandIsologo = document.querySelector<HTMLImageElement>("[data-pps-shell-isologo]");
if (brandIsologo && !brandIsologo.getAttribute("src")) {
  brandIsologo.src = shellIsologoHref(siteRoot);
}

mountShellSidebar();
