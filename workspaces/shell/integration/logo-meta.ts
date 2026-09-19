/** Keep in sync with ../src/logo-meta.ts (compiled into integration dist for static shell HTML). */

export const SHELL_LOGO_WIDTH = 5000;
export const SHELL_LOGO_HEIGHT = 1837;
export const SHELL_ISOLOGO_WIDTH = 1207;
export const SHELL_ISOLOGO_HEIGHT = 1565;
export const SHELL_ISOLOGO_ALT = "Universidad Austral";
export const SHELL_LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";
export const SHELL_ISOLOGO_PATH = "assets/shell/isologo-blanco.png";

export function shellLogoHref(siteRoot: string): string {
  const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  return `${root}${SHELL_LOGO_PATH}`;
}

export function shellIsologoHref(siteRoot: string): string {
  const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  return `${root}${SHELL_ISOLOGO_PATH}`;
}
