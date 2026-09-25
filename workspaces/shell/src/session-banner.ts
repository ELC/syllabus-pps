import { isEthicalAdsHostAllowed, scheduleEthicalAdsLoad } from "./ethical-ads";
import { applyEthicalAdsPlacementToBanner, createSessionBannerFoot } from "./session-banner-dom";

function isEthicalAdsSessionBanner(banner: HTMLElement): boolean {
  return (
    banner.hasAttribute("data-ea-publisher") || banner.classList.contains("dashboard__ethical-ads")
  );
}

function hideEthicalAdsBannerLocally(banner: HTMLElement): boolean {
  if (isEthicalAdsHostAllowed() || !isEthicalAdsSessionBanner(banner)) {
    return false;
  }

  const foot = banner.closest<HTMLElement>("[data-pps-main-foot]");
  banner.hidden = true;
  if (foot) {
    foot.hidden = true;
  }
  return true;
}

/** One dismiss per browser tab session across all PPS subsites. */
export const SESSION_BANNER_DISMISSED_KEY = "pps.sessionBanner.dismissed";

export function isSessionBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissSessionBanner(): void {
  try {
    sessionStorage.setItem(SESSION_BANNER_DISMISSED_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
}

function ensureSessionBanner(root: ParentNode): HTMLElement | null {
  let banner = root.querySelector<HTMLElement>("[data-pps-session-banner]");
  if (banner) {
    if (
      banner.hasAttribute("data-ea-publisher") ||
      banner.classList.contains("dashboard__ethical-ads")
    ) {
      applyEthicalAdsPlacementToBanner(banner);
    }
    return banner;
  }

  const main = root.querySelector<HTMLElement>(".dashboard__main");
  if (!main || !isEthicalAdsHostAllowed()) {
    return null;
  }

  const foot = createSessionBannerFoot();
  main.append(foot);
  banner = foot.querySelector<HTMLElement>("[data-pps-session-banner]");
  return banner;
}

function bindSessionBanner(banner: HTMLElement): void {
  if (hideEthicalAdsBannerLocally(banner)) {
    return;
  }

  const foot = banner.closest<HTMLElement>("[data-pps-main-foot]");
  if (foot?.dataset.ppsSessionBannerBound === "1") {
    if (!isSessionBannerDismissed() && banner.hidden) {
      foot.hidden = false;
      banner.hidden = false;
      scheduleEthicalAdsLoad();
    }
    return;
  }

  if (foot) {
    foot.dataset.ppsSessionBannerBound = "1";
  }

  const closeButton = foot?.querySelector<HTMLButtonElement>("[data-pps-session-banner-close]");

  const hideBanner = () => {
    banner.hidden = true;
    if (foot && !foot.querySelector(".dashboard__session-banner:not([hidden])")) {
      foot.hidden = true;
    }
  };

  if (isSessionBannerDismissed()) {
    hideBanner();
    return;
  }

  if (foot) {
    foot.hidden = false;
  }
  banner.hidden = false;
  scheduleEthicalAdsLoad();

  closeButton?.addEventListener("click", () => {
    dismissSessionBanner();
    hideBanner();
  });
}

/** Shows the main session banner unless dismissed this browser session. */
export function mountSessionBanner(root: ParentNode = document): void {
  const banner = ensureSessionBanner(root);
  if (!banner) {
    return;
  }

  bindSessionBanner(banner);
}

export function scheduleMountSessionBanner(): void {
  const run = () => mountSessionBanner();
  run();
  requestAnimationFrame(run);
}
