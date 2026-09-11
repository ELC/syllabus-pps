import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const siteDir = fileURLToPath(new URL(".", import.meta.url));
const cmsRoot = join(siteDir, "../cms");
const cmsConfigFile = join(cmsRoot, "vite.config.ts");

/** @returns {import('vite').Plugin} */
export function cmsDevPlugin() {
  /** @type {import('vite').ViteDevServer | undefined} */
  let cmsServer;

  return {
    name: "pps-cms-dev",
    apply: "serve",
    enforce: "pre",
    async configureServer(astroServer) {
      cmsServer = await createViteServer({
        configFile: cmsConfigFile,
        root: cmsRoot,
        base: "/cms/",
        server: {
          middlewareMode: true,
          hmr: { server: astroServer.httpServer },
        },
        appType: "spa",
      });

      astroServer.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url === "/cms" || url.startsWith("/cms/") || url.startsWith("/cms?")) {
          cmsServer.middlewares(req, res, next);
          return;
        }
        next();
      });

      return () => {
        void cmsServer.close();
      };
    },
  };
}
