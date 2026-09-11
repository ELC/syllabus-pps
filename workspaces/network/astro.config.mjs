import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const base = process.env.NETWORK_BASE ?? "/network/";

export default defineConfig({
  base,
  outDir: "dist",
  publicDir: "public",
  server: {
    port: 4324,
    strictPort: true,
  },
  vite: {
    resolve: {
      alias: {
        "@pps/core": resolve(rootDir, "../pps-core/src/index.ts"),
        "@pps/shell": resolve(rootDir, "../shell/src"),
      },
    },
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
