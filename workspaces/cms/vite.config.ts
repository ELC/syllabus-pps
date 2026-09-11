import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { shellHeadPlugin } from "../shell/vite/shell-head.mjs";
import { localContentPlugin } from "./vite.local-content";
import { staticContentPlugin } from "./vite.static-content";

const base = process.env.CMS_BASE ?? "/cms/";

export default defineConfig({
  base,
  plugins: [
    react(),
    shellHeadPlugin("CMS_BASE", "/cms/", {
      activeNav: "cms",
      prerenderShell: true,
      sidebarExtraId: "cms-sidebar-extra",
      mainClass: "dashboard-main",
    }),
    localContentPlugin(),
    staticContentPlugin(),
  ],
  resolve: {
    alias: {
      "@pps/core": resolve(__dirname, "../pps-core/src/index.ts"),
      "@pps/shell": resolve(__dirname, "../shell/src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ["../.."],
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
