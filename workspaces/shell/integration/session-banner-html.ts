/** Kept in sync with `@pps/shell/ethical-ads` for prerendered SPA shells. */
export const ETHICAL_ADS_CLIENT_SCRIPT_URL =
  "https://media.ethicalads.io/media/client/ethicalads.min.js";

const ETHICAL_ADS_PUBLISHER_ID = "elcgithubio";
const ETHICAL_ADS_KEYWORDS = "education|curriculum|developers|software";

function ethicalAdsFooterPlacementId(activeNav: string): string {
  return `pps-${activeNav}-main-foot`;
}

export function renderSessionBannerFoot(activeNav: string): string {
  const placementId = ethicalAdsFooterPlacementId(activeNav);
  return `
    <div class="dashboard__main-foot" data-pps-main-foot hidden>
      <div
        class="dashboard__session-banner dashboard__ethical-ads flat adaptive-css"
        id="${placementId}"
        role="region"
        aria-label="Publicidad"
        data-pps-session-banner
        data-ea-publisher="${ETHICAL_ADS_PUBLISHER_ID}"
        data-ea-type="text"
        data-ea-keywords="${ETHICAL_ADS_KEYWORDS}"
        hidden
      ></div>
      <button
        type="button"
        class="dashboard__session-banner-close"
        data-pps-session-banner-close
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>`;
}
