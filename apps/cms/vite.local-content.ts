import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

const contentDir = resolve("../../content/pages");

export function localContentPlugin(): Plugin {
  return {
    name: "pps-local-content",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }

        try {
          if (req.url === "/api/pages" && req.method === "GET") {
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

          const pageMatch = req.url.match(/^\/api\/page\/([^/?]+)/);
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
      });
    },
  };
}
