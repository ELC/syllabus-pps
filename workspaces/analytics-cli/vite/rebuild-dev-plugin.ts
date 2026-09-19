import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from "vite";

import { createServerClientFromEnv } from "@pps/content";

const REBUILD_ANALYTICS_PATHS = new Set([
  "/api/rebuild-analytics",
  "/cms/api/rebuild-analytics",
  "/cites/api/rebuild-analytics",
]);

function requestPathname(url: string): string {
  const raw = url.split("?")[0] ?? "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  return raw.replace(/\/+/g, "/");
}

function normalizeApiPath(url: string, base: string): string | null {
  const path = requestPathname(url);
  if (REBUILD_ANALYTICS_PATHS.has(path)) {
    return "/api/rebuild-analytics";
  }

  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  if (normalizedBase !== "/" && path === `${normalizedBase}api/rebuild-analytics`.replace(/\/+/g, "/")) {
    return "/api/rebuild-analytics";
  }

  return null;
}

function loadRepoEnv(repoRoot: string): void {
  const env = loadEnv("development", repoRoot, "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined && typeof value === "string") {
      process.env[key] = value;
    }
  }
}

export interface RebuildDevPluginOptions {
  repoRoot: string;
}

export function createRebuildDevMiddleware(
  base: string,
  options: RebuildDevPluginOptions,
): Connect.NextHandleFunction {
  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const apiPath = normalizeApiPath(req.url ?? "", base);
    if (!apiPath) {
      next();
      return;
    }

    loadRepoEnv(options.repoRoot);

    void (async () => {
      try {
        if (apiPath === "/api/rebuild-analytics" && req.method === "POST") {
          const { rebuildAnalyticsInSupabase } = await import("@pps/analytics-cli/rebuild-remote");
          const client = createServerClientFromEnv();
          const result = await rebuildAnalyticsInSupabase(client);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(result));
          return;
        }

        res.statusCode = 405;
        res.end("Method not allowed");
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    })();
  };
}

export function rebuildDevPlugin(options: RebuildDevPluginOptions): Plugin {
  return {
    name: "pps-analytics-rebuild-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createRebuildDevMiddleware(server.config.base, options));
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(createRebuildDevMiddleware(server.config.base, options));
    },
  };
}

/** Handles rebuild POST on the main site dev server (before nested CMS/Cites SPAs). */
export function siteRebuildDevPlugin(options: RebuildDevPluginOptions): Plugin {
  const handler = createRebuildDevMiddleware("/", options);
  return {
    name: "pps-site-rebuild-analytics",
    apply: "serve",
    enforce: "pre",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const path = requestPathname(req.url ?? "");
        if (!REBUILD_ANALYTICS_PATHS.has(path)) {
          next();
          return;
        }
        handler(req, res, next);
      });
    },
  };
}
