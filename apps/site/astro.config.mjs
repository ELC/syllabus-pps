import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "astro/config";
import { localContentPlugin } from "../cms/vite.local-content";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  outDir: "dist",
  publicDir: "public",
  server: {
    port: 4321,
    strictPort: true,
  },
  vite: {
    plugins: [react(), localContentPlugin()],
    resolve: {
      alias: {
        "@pps/core": resolve(rootDir, "../../packages/pps-core/src/index.ts"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-dev-runtime", "react/jsx-runtime"],
    },
    server: {
      fs: {
        allow: ["../.."],
      },
    },
  },
});
