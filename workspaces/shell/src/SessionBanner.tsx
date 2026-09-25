import { useEffect, useState } from "react";

import {
  ETHICAL_ADS_KEYWORDS,
  ETHICAL_ADS_PUBLISHER_ID,
  ethicalAdsFooterPlacementId,
  isEthicalAdsHostAllowed,
} from "./ethical-ads";
import { applyEthicalAdsPlacementToBanner, resolveSessionBannerNavId } from "./session-banner-dom";
import {
  dismissSessionBanner,
  isSessionBannerDismissed,
  scheduleMountSessionBanner,
} from "./session-banner";

interface SessionBannerProps {
  /** Defaults to the active subsite nav id. */
  navId?: Parameters<typeof ethicalAdsFooterPlacementId>[0];
}

export function SessionBanner({ navId }: SessionBannerProps) {
  const [visible, setVisible] = useState(() => !isSessionBannerDismissed());

  useEffect(() => {
    setVisible(!isSessionBannerDismissed());
    scheduleMountSessionBanner();
  }, []);

  useEffect(() => {
    const banner = document.querySelector<HTMLElement>("[data-pps-session-banner]");
    if (banner) {
      applyEthicalAdsPlacementToBanner(banner, navId ?? resolveSessionBannerNavId());
    }
  }, [navId]);

  if (!visible || !isEthicalAdsHostAllowed()) {
    return null;
  }

  const resolvedNavId = navId ?? resolveSessionBannerNavId();

  return (
    <div className="dashboard__main-foot" data-pps-main-foot>
      <div
        className="dashboard__session-banner dashboard__ethical-ads flat adaptive-css"
        role="region"
        aria-label="Publicidad"
        id={ethicalAdsFooterPlacementId(resolvedNavId)}
        data-pps-session-banner
        data-ea-publisher={ETHICAL_ADS_PUBLISHER_ID}
        data-ea-type="text"
        data-ea-keywords={ETHICAL_ADS_KEYWORDS}
      />
      <button
        type="button"
        className="dashboard__session-banner-close"
        data-pps-session-banner-close
        aria-label="Cerrar aviso"
        onClick={() => {
          dismissSessionBanner();
          setVisible(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
