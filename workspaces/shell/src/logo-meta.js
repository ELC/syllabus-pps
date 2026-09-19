/** Intrinsic pixel size of assets/logo-horizontal-blanco.png (used for layout reservation). */
export const SHELL_LOGO_WIDTH = 5000;
export const SHELL_LOGO_HEIGHT = 1837;
/** Cropped from the right side of logo-horizontal-blanco.png (circular emblem). */
export const SHELL_ISOLOGO_WIDTH = 1207;
export const SHELL_ISOLOGO_HEIGHT = 1565;
export const SHELL_ISOLOGO_ALT = "Universidad Austral";
export const SHELL_LOGO_ALT = SHELL_ISOLOGO_ALT;
/** Stable path under @pps/site public/ — same URL on every subsite for browser caching. */
export const SHELL_LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";
export const SHELL_ISOLOGO_PATH = "assets/shell/isologo-blanco.png";
export function shellLogoHref(siteRoot) {
    const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
    return `${root}${SHELL_LOGO_PATH}`;
}
export function shellIsologoHref(siteRoot) {
    const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
    return `${root}${SHELL_ISOLOGO_PATH}`;
}
