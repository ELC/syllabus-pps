import { dev } from "astro";
import { join } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";

import { quietEmbeddedDevPlugin } from "./quiet-embedded-dev.js";

type AstroDevServer = Awaited<ReturnType<typeof dev>>;

interface ViteSpaDevSpec {
  name: string;
  workspace: string;
  configFile: string;
  base: string;
}

interface AstroDevSpec {
  name: string;
  workspace: string;
  base: string;
  /** Dev-only paths owned by this subsite (for import chains without a /network/ referer). */
  ownedPathPrefixes: string[];
}

/** Astro dev HTML references Vite assets at the server root (no base prefix). */
const ASTRO_DEV_ASSET_PATH = /^\/(@vite|@fs|@id|src|node_modules|_astro)(\/|$)/;

function workspacePath(repoRoot: string, workspace: string): string {
  return join(repoRoot, "workspaces", workspace);
}

function pathnameOf(url: string): string {
  return url.split("?")[0] ?? url;
}

function refererMatchesSubsite(referer: string | undefined, basePrefix: string): boolean {
  if (!referer) {
    return false;
  }

  try {
    const path = new URL(referer).pathname;
    return path === basePrefix || path.startsWith(`${basePrefix}/`);
  } catch {
    return false;
  }
}

function pathOwnedBySubsite(pathname: string, ownedPathPrefixes: string[]): boolean {
  return ownedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function refererOwnedBySubsite(
  referer: string | undefined,
  ownedPathPrefixes: string[],
): boolean {
  if (!referer) {
    return false;
  }

  try {
    return pathOwnedBySubsite(new URL(referer).pathname, ownedPathPrefixes);
  } catch {
    return false;
  }
}

function shouldRouteToAstroSubsite(
  url: string,
  referer: string | undefined,
  basePrefix: string,
  ownedPathPrefixes: string[],
): boolean {
  const pathname = pathnameOf(url);
  if (
    pathname === basePrefix ||
    pathname.startsWith(`${basePrefix}/`) ||
    url.startsWith(`${basePrefix}?`)
  ) {
    return true;
  }

  if (pathOwnedBySubsite(pathname, ownedPathPrefixes)) {
    return true;
  }

  if (!ASTRO_DEV_ASSET_PATH.test(pathname)) {
    return false;
  }

  return (
    refererMatchesSubsite(referer, basePrefix) ||
    refererOwnedBySubsite(referer, ownedPathPrefixes)
  );
}

function createViteSpaDevMiddleware(repoRoot: string, spec: ViteSpaDevSpec): Plugin {
  const basePath = spec.base.endsWith("/") ? spec.base : `${spec.base}/`;
  const basePrefix = basePath.slice(0, -1);
  const root = workspacePath(repoRoot, spec.workspace);
  const configFile = join(root, spec.configFile);

  return {
    name: `pps-${spec.name}-dev`,
    apply: "serve",
    enforce: "pre",
    configureServer(astroServer) {
      let workspaceServer: ViteDevServer | undefined;
      let workspaceServerPromise: Promise<ViteDevServer> | undefined;

      const ensureWorkspaceServer = () => {
        if (!workspaceServerPromise) {
          workspaceServerPromise = createViteServer({
            configFile,
            root,
            base: basePath,
            plugins: [quietEmbeddedDevPlugin()],
            server: {
              middlewareMode: true,
              // Nested SPAs share the site HTTP port; disable HMR to avoid ws conflicts/noise.
              hmr: false,
            },
            ssr: {
              noExternal: ["@pps/shell", "@pps/config", "@pps/login", "@pps/core"],
            },
            appType: "spa",
          }).then((server) => {
            workspaceServer = server;
            return server;
          });
        }

        return workspaceServerPromise;
      };

      astroServer.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url === basePrefix || url.startsWith(`${basePrefix}/`) || url.startsWith(`${basePrefix}?`)) {
          void ensureWorkspaceServer()
            .then((server) => {
              server.middlewares(req, res, next);
            })
            .catch((error) => {
              console.error(`[pps-${spec.name}-dev]`, error);
              next(error);
            });
          return;
        }
        next();
      });

      return () => {
        void workspaceServer?.close();
      };
    },
  };
}

function createAstroDevMiddleware(repoRoot: string, spec: AstroDevSpec): Plugin {
  const basePath = spec.base.endsWith("/") ? spec.base : `${spec.base}/`;
  const basePrefix = basePath.slice(0, -1);
  const root = workspacePath(repoRoot, spec.workspace);

  return {
    name: `pps-${spec.name}-dev`,
    apply: "serve",
    enforce: "pre",
    configureServer(astroServer) {
      let workspaceServer: AstroDevServer | undefined;
      let workspaceServerPromise: Promise<AstroDevServer> | undefined;

      const ensureWorkspaceServer = () => {
        if (!workspaceServerPromise) {
          workspaceServerPromise = dev({
            root,
            base: basePath,
            logLevel: "warn",
            vite: {
              plugins: [quietEmbeddedDevPlugin()],
              server: {
                // Nested Astro dev servers share the site HTTP port; disable HMR to avoid ws conflicts.
                hmr: false,
              },
            },
          }).then((server) => {
            workspaceServer = server;
            return server;
          });
        }

        return workspaceServerPromise;
      };

      astroServer.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const referer = req.headers.referer ?? req.headers.referrer;
        const refererHeader = typeof referer === "string" ? referer : undefined;
        if (!shouldRouteToAstroSubsite(url, refererHeader, basePrefix, spec.ownedPathPrefixes)) {
          next();
          return;
        }

        void ensureWorkspaceServer()
          .then((server) => {
            server.handle(req, res);
          })
          .catch((error) => {
            console.error(`[pps-${spec.name}-dev]`, error);
            next(error);
          });
      });

      return () => {
        void workspaceServer?.stop();
      };
    },
  };
}

/** Vite/Astro dev middleware that mounts all PPS subsites into the site dev server. */
export function subsitesDevPlugins(repoRoot: string): Plugin[] {
  return [
    createViteSpaDevMiddleware(repoRoot, {
      name: "cms",
      workspace: "cms",
      configFile: "vite.config.ts",
      base: "/cms/",
    }),
    createViteSpaDevMiddleware(repoRoot, {
      name: "roadmap",
      workspace: "roadmap",
      configFile: "vite.config.ts",
      base: "/roadmap/",
    }),
    createAstroDevMiddleware(repoRoot, {
      name: "analytics",
      workspace: "analytics",
      base: "/analytics/",
      ownedPathPrefixes: [
        "/src/scripts/analytics-dashboard",
        "/src/styles/analytics.css",
        "/src/pages/graph",
      ],
    }),
    createAstroDevMiddleware(repoRoot, {
      name: "network",
      workspace: "network",
      base: "/network/",
      ownedPathPrefixes: ["/src/scripts/graph", "/src/styles/network.css"],
    }),
  ];
}
