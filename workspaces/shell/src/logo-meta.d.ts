/** Intrinsic pixel size of assets/logo-horizontal-blanco.png (used for layout reservation). */
export declare const SHELL_LOGO_WIDTH = 5000;
export declare const SHELL_LOGO_HEIGHT = 1837;
/** Cropped from the right side of logo-horizontal-blanco.png (circular emblem). */
export declare const SHELL_ISOLOGO_WIDTH = 1207;
export declare const SHELL_ISOLOGO_HEIGHT = 1565;
export declare const SHELL_ISOLOGO_ALT = "Universidad Austral";
export declare const SHELL_LOGO_ALT: "Universidad Austral";
/** Stable path under @pps/site public/ — same URL on every subsite for browser caching. */
export declare const SHELL_LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";
export declare const SHELL_ISOLOGO_PATH = "assets/shell/isologo-blanco.png";
export declare function shellLogoHref(siteRoot: string): string;
export declare function shellIsologoHref(siteRoot: string): string;
