import {
  ETHICAL_ADS_KEYWORDS,
  ETHICAL_ADS_PUBLISHER_ID,
  ethicalAdsFooterPlacementId,
} from "./ethical-ads";
import { NAV_ITEMS } from "./nav";
import type { NavId } from "./site-root";

export function resolveSessionBannerNavId(): NavId {
  const active = document.querySelector<HTMLElement>(".dashboard__link--active[data-pps-nav-id]");
  const fromNav = active?.dataset.ppsNavId?.trim();
  if (fromNav) {
    return fromNav as NavId;
  }

  const path = window.location.pathname;
  for (const item of NAV_ITEMS) {
    if (!item.segment) {
      continue;
    }
    const segmentPath = `/${item.segment}`;
    if (path.includes(segmentPath)) {
      return item.id;
    }
  }

  return "home";
}

export function applyEthicalAdsPlacementToBanner(
  banner: HTMLElement,
  navId: NavId = resolveSessionBannerNavId(),
): void {
  banner.classList.add("dashboard__session-banner", "dashboard__ethical-ads", "flat", "adaptive-css");
  if (!banner.id) {
    banner.id = ethicalAdsFooterPlacementId(navId);
  }
  if (!banner.hasAttribute("data-ea-publisher")) {
    banner.setAttribute("data-ea-publisher", ETHICAL_ADS_PUBLISHER_ID);
    banner.setAttribute("data-ea-type", "text");
    banner.setAttribute("data-ea-keywords", ETHICAL_ADS_KEYWORDS);
  }
  if (!banner.getAttribute("aria-label")) {
    banner.setAttribute("aria-label", "Publicidad");
  }
  banner.dataset.ppsSessionBanner = "";
}

export function createSessionBannerFoot(navId: NavId = resolveSessionBannerNavId()): HTMLElement {
  const foot = document.createElement("div");
  foot.className = "dashboard__main-foot";
  foot.setAttribute("data-pps-main-foot", "");
  foot.hidden = true;

  const banner = document.createElement("div");
  banner.role = "region";
  applyEthicalAdsPlacementToBanner(banner, navId);
  banner.hidden = true;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "dashboard__session-banner-close";
  closeButton.setAttribute("data-pps-session-banner-close", "");
  closeButton.setAttribute("aria-label", "Cerrar aviso");
  closeButton.textContent = "×";

  foot.append(banner, closeButton);
  return foot;
}
