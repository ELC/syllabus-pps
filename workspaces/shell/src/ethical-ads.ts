import type { NavId } from "./site-root";

export const ETHICAL_ADS_CLIENT_SCRIPT_URL =
  "https://media.ethicalads.io/media/client/ethicalads.min.js";

export const ETHICAL_ADS_PUBLISHER_ID = "elcgithubio";

export const ETHICAL_ADS_KEYWORDS = "education|curriculum|developers|software";

const LOCAL_ETHICAL_ADS_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** EthicalAds must not load on local dev hosts (avoids counting dev impressions). */
export function isEthicalAdsHostAllowed(location?: Pick<Location, "hostname">): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = (location ?? window.location).hostname.trim().toLowerCase();
  if (!host || LOCAL_ETHICAL_ADS_HOSTS.has(host)) {
    return false;
  }
  return !host.endsWith(".localhost");
}

/** Per-subsite placement id for EthicalAds reporting (Settings → Record placements). */
export function ethicalAdsFooterPlacementId(navId: NavId): string {
  return `pps-${navId}-main-foot`;
}

declare global {
  interface Window {
    ethicalads?: {
      load: () => void;
      wait: Promise<unknown[]>;
    };
  }
}

export function requestEthicalAdsLoad(): void {
  window.ethicalads?.load();
}

function findEthicalAdsPlacement(root: ParentNode): HTMLElement | null {
  if (root instanceof HTMLElement && root.hasAttribute("data-ea-publisher")) {
    return root;
  }
  return root.querySelector<HTMLElement>("[data-ea-publisher]");
}

/** Load placements after the banner is shown (script may still be async). */
export function scheduleEthicalAdsLoad(root: ParentNode = document): void {
  if (!isEthicalAdsHostAllowed()) {
    return;
  }

  if (!findEthicalAdsPlacement(root)) {
    return;
  }

  const run = () => {
    requestEthicalAdsLoad();
    void window.ethicalads?.wait.then(() => requestEthicalAdsLoad());
  };

  if (window.ethicalads) {
    run();
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${ETHICAL_ADS_CLIENT_SCRIPT_URL}"]`,
  );
  if (existing) {
    existing.addEventListener("load", run, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = ETHICAL_ADS_CLIENT_SCRIPT_URL;
  script.async = true;
  script.addEventListener("load", run, { once: true });
  document.head.append(script);
}
