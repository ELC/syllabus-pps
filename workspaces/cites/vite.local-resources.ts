import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";

const citesDir = fileURLToPath(new URL(".", import.meta.url));
const resourcesPath = resolve(citesDir, "../../content/resources.json");

function normalizeApiPath(url: string, base: string): string | null {
  const path = url.split("?")[0] ?? "";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;

  if (path.startsWith("/api/")) {
    return path;
  }

  if (normalizedBase !== "/" && path.startsWith(`${normalizedBase}api/`)) {
    return `/${path.slice(normalizedBase.length)}`;
  }

  return null;
}

function createResourcesMiddleware(base: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const apiPath = normalizeApiPath(req.url ?? "", base);
    if (!apiPath) {
      next();
      return;
    }

    try {
      if (apiPath === "/api/resources" && req.method === "GET") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(readFileSync(resourcesPath, "utf8"));
        return;
      }

      if (apiPath === "/api/resources" && req.method === "PUT") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          writeFileSync(resourcesPath, body, "utf8");
          res.statusCode = 204;
          res.end();
        });
        return;
      }

      res.statusCode = 404;
      res.end("Not found");
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    }
  };
}

export function localResourcesPlugin(): Plugin {
  return {
    name: "pps-local-resources",
    configureServer(server) {
      server.middlewares.use(createResourcesMiddleware(server.config.base));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createResourcesMiddleware(server.config.base));
    },
  };
}
