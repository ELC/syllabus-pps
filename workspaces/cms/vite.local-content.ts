import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";

const cmsDir = fileURLToPath(new URL(".", import.meta.url));
const contentDir = resolve(cmsDir, "../../content/pages");

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

function createContentMiddleware(base: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const apiPath = normalizeApiPath(req.url ?? "", base);
    if (!apiPath) {
      next();
      return;
    }

    try {
      if (apiPath === "/api/pages" && req.method === "GET") {
        const pages = readdirSync(contentDir)
          .filter((entry) => entry.endsWith(".md"))
          .map((entry) => ({
            slug: entry.replace(/\.md$/i, ""),
            path: entry,
          }));
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(pages));
        return;
      }

      const pageMatch = apiPath.match(/^\/api\/page\/([^/?]+)/);
      if (pageMatch) {
        const slug = decodeURIComponent(pageMatch[1] ?? "");
        const filePath = join(contentDir, `${slug}.md`);

        if (req.method === "GET") {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(readFileSync(filePath, "utf8"));
          return;
        }

        if (req.method === "PUT") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            writeFileSync(filePath, body, "utf8");
            res.statusCode = 204;
            res.end();
          });
          return;
        }
      }

      res.statusCode = 404;
      res.end("Not found");
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    }
  };
}

export function localContentPlugin(): Plugin {
  return {
    name: "pps-local-content",
    configureServer(server) {
      server.middlewares.use(createContentMiddleware(server.config.base));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createContentMiddleware(server.config.base));
    },
  };
}
