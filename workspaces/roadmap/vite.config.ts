import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { shellHeadPlugin } from "../shell/vite/shell-head.mjs";

const base = process.env.ROADMAP_BASE ?? "/roadmap/";

export default defineConfig({
  base,
  plugins: [
    react(),
    shellHeadPlugin("ROADMAP_BASE", "/roadmap/", { activeNav: "roadmap", prerenderShell: true }),
  ],
  resolve: {
    alias: {
      "@pps/core": resolve(__dirname, "../pps-core/src/index.ts"),
      "@pps/shell": resolve(__dirname, "../shell/src"),
    },
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});
