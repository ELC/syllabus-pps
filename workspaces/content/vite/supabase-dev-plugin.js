"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STORAGE_BUCKET = void 0;
exports.createSupabaseDevMiddleware = createSupabaseDevMiddleware;
exports.supabaseDevPlugin = supabaseDevPlugin;
const vite_1 = require("vite");
const index_1 = require("../src/index");
Object.defineProperty(exports, "DEFAULT_STORAGE_BUCKET", { enumerable: true, get: function () { return index_1.DEFAULT_STORAGE_BUCKET; } });
function normalizeApiPath(url, base) {
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
function loadRepoEnv(repoRoot) {
    const env = (0, vite_1.loadEnv)("development", repoRoot, "");
    for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
function createSupabaseDevMiddleware(base, options) {
    const { pages = false, resources = false } = options;
    return (req, res, next) => {
        const apiPath = normalizeApiPath(req.url ?? "", base);
        if (!apiPath) {
            next();
            return;
        }
        loadRepoEnv(options.repoRoot);
        void (async () => {
            try {
                const client = (0, index_1.createServerClientFromEnv)();
                const bucket = (0, index_1.readStorageBucketFromEnv)();
                if (resources && apiPath === "/api/resources" && req.method === "GET") {
                    const entries = await (0, index_1.fetchResourceCatalog)(client);
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(entries));
                    return;
                }
                if (resources && apiPath === "/api/resources" && req.method === "PUT") {
                    const body = await readRequestBody(req);
                    const entries = JSON.parse(body);
                    await (0, index_1.replaceResourceCatalog)(client, entries);
                    res.statusCode = 204;
                    res.end();
                    return;
                }
                if (pages && apiPath === "/api/pages" && req.method === "GET") {
                    const remotePages = await (0, index_1.listPages)(client, bucket);
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(remotePages));
                    return;
                }
                const pageMatch = apiPath.match(/^\/api\/page\/([^/?]+)/);
                if (pages && pageMatch) {
                    const slug = decodeURIComponent(pageMatch[1] ?? "");
                    if (req.method === "GET") {
                        res.setHeader("Content-Type", "text/plain; charset=utf-8");
                        res.end(await (0, index_1.readPage)(client, bucket, slug));
                        return;
                    }
                    if (req.method === "PUT") {
                        const body = await readRequestBody(req);
                        await (0, index_1.writePage)(client, bucket, slug, body);
                        res.statusCode = 204;
                        res.end();
                        return;
                    }
                }
                res.statusCode = 404;
                res.end("Not found");
            }
            catch (error) {
                res.statusCode = 500;
                res.end(error instanceof Error ? error.message : String(error));
            }
        })();
    };
}
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}
function supabaseDevPlugin(options) {
    return {
        name: "pps-supabase-dev",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use(createSupabaseDevMiddleware(server.config.base, options));
        },
        configurePreviewServer(server) {
            server.middlewares.use(createSupabaseDevMiddleware(server.config.base, options));
        },
    };
}
