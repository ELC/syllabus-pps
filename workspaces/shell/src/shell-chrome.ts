import "@pps/login/styles/login.css";

import { shellLogoHref } from "./logo-meta";
import { siteRootFromEnv } from "./site-root";

import "./styles/shell.css";

const brandImg = document.querySelector<HTMLImageElement>("[data-pps-shell-logo]");
if (brandImg && !brandImg.getAttribute("src")) {
  brandImg.src = shellLogoHref(siteRootFromEnv(import.meta.env.BASE_URL));
}
