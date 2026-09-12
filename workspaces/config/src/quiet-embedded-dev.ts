import type { Connect } from "vite";
import type { Plugin } from "vite";

import { VITE_CLIENT_STUB_BODY } from "./vite-client-stub.js";

function pathnameOf(url: string): string {
  return url.split("?")[0] ?? url;
}

function refererPath(referer: string | undefined): string | null {
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

function isEmbeddedSubsiteReferer(referer: string | undefined): boolean {
  const path = refererPath(referer);
  if (!path) {
    return false;
  }

  return /^\/(analytics|network|cms|roadmap)(\/|$)/.test(path);
}

function shouldStubViteClient(url: string, referer: string | undefined, scope: "embedded" | "site"): boolean {
  const pathname = pathnameOf(url);
  if (!pathname.includes("@vite/client")) {
    return false;
  }

  if (scope === "embedded") {
    return true;
  }

  if (pathname.startsWith("/cms/@vite/") || pathname.startsWith("/roadmap/@vite/")) {
    return true;
  }

  if (pathname.startsWith("/@vite/") && isEmbeddedSubsiteReferer(referer)) {
    return true;
  }

  return false;
}

function stripHmrScripts(html: string): string {
  return html
    .replace(/<script type="module">\s*import \{ injectIntoGlobalHook \}[\s\S]*?<\/script>\s*/gi, "")
    .replace(/<script type="module" src="[^"]*@vite\/client[^"]*"><\/script>\s*/gi, "")
    .replace(/<script type="module" src="[^"]*@react-refresh[^"]*"><\/script>\s*/gi, "");
}

export interface QuietEmbeddedDevPluginOptions {
  /** Embedded subsites stub every @vite/client request; the site host stubs only nested subsite traffic. */
  scope?: "embedded" | "site";
  /** Disable Vite HMR for this dev server. */
  disableHmr?: boolean;
}

/** Disable HMR client noise for subsites mounted into the site dev server. */
export function quietEmbeddedDevPlugin(options: QuietEmbeddedDevPluginOptions = {}): Plugin {
  const scope = options.scope ?? "embedded";
  const disableHmr = options.disableHmr ?? scope === "embedded";

  return {
    name: "pps-quiet-embedded-dev",
    enforce: "pre",
    apply: "serve",
    ...(disableHmr
      ? {
          config: () => ({
            server: {
              hmr: false,
            },
          }),
        }
      : {}),
    configureServer(server) {
      const stubClient: Connect.NextHandleFunction = (req, res, next) => {
        const url = req.url ?? "";
        const referer = req.headers.referer ?? req.headers.referrer;
        const refererHeader = typeof referer === "string" ? referer : undefined;
        if (!shouldStubViteClient(url, refererHeader, scope)) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(VITE_CLIENT_STUB_BODY);
      };

      // Vite serves /@vite/client internally; prepend so subsite stubs win.
      type ConnectStack = { stack: Array<{ route: string; handle: Connect.NextHandleFunction }> };
      (server.middlewares as ConnectStack).stack.unshift({ route: "", handle: stubClient });
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        if (scope === "site") {
          return html;
        }

        return stripHmrScripts(html);
      },
    },
  };
}
