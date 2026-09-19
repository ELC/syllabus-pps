import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
import {
  createServerClientFromEnv,
  DEFAULT_STORAGE_BUCKET,
  fetchAllPageSources,
  fetchResourceCatalog,
  listPages,
  readPage,
  readStorageBucketFromEnv,
  replaceResourceCatalog,
  writePage,
} from "@pps/content";

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

function loadRepoEnv(repoRoot: string): void {
  const env = loadEnv("development", repoRoot, "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined && typeof value === "string") {
      process.env[key] = value;
    }
  }
}

export interface SupabaseDevPluginOptions {
  repoRoot: string;
  pages?: boolean;
  resources?: boolean;
}

export function createSupabaseDevMiddleware(
  base: string,
  options: SupabaseDevPluginOptions,
): Connect.NextHandleFunction {
  const { pages = false, resources = false } = options;

  return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const apiPath = normalizeApiPath(req.url ?? "", base);
    if (!apiPath) {
      next();
      return;
    }

    loadRepoEnv(options.repoRoot);

    void (async () => {
      try {
        const client = createServerClientFromEnv();
        const bucket = readStorageBucketFromEnv();

        if (resources && apiPath === "/api/resources" && req.method === "GET") {
          const entries = await fetchResourceCatalog(client);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(entries));
          return;
        }

        if (resources && apiPath === "/api/resources" && req.method === "PUT") {
          const body = await readRequestBody(req);
          const entries = JSON.parse(body);
          await replaceResourceCatalog(client, entries);
          res.statusCode = 204;
          res.end();
          return;
        }

        if (pages && apiPath === "/api/pages" && req.method === "GET") {
          const remotePages = await listPages(client, bucket);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(remotePages));
          return;
        }

        if (pages && apiPath === "/api/pages/sources" && req.method === "GET") {
          const sources = await fetchAllPageSources(client, bucket);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(sources));
          return;
        }

        const pageMatch = apiPath.match(/^\/api\/page\/([^/?]+)/);
        if (pages && pageMatch) {
          const slug = decodeURIComponent(pageMatch[1] ?? "");

          if (req.method === "GET") {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(await readPage(client, bucket, slug));
            return;
          }

          if (req.method === "PUT") {
            const body = await readRequestBody(req);
            await writePage(client, bucket, slug, body);
            res.statusCode = 204;
            res.end();
            return;
          }
        }

        res.statusCode = 404;
        res.end("Not found");
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : String(error));
      }
    })();
  };
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export function supabaseDevPlugin(options: SupabaseDevPluginOptions): Plugin {
  return {
    name: "pps-supabase-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createSupabaseDevMiddleware(server.config.base, options));
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(createSupabaseDevMiddleware(server.config.base, options));
    },
  };
}

export { DEFAULT_STORAGE_BUCKET };
