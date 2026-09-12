/** Intrinsic pixel size of assets/logo-horizontal-blanco.png (used for layout reservation). */
export const SHELL_LOGO_WIDTH = 5000;
export const SHELL_LOGO_HEIGHT = 1837;
export const SHELL_LOGO_ALT = "Universidad Austral";
/** Stable path under @pps/site public/ — same URL on every subsite for browser caching. */
export const SHELL_LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";
export function shellLogoHref(siteRoot) {
    const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
    return `${root}${SHELL_LOGO_PATH}`;
}
