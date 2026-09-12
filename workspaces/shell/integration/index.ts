import type { AstroIntegration } from "astro";

import { shellHeadPlugin } from "./vite-shell-head.js";

export interface PpsShellViteSpaOptions {
  baseEnvVar: string;
  defaultBase: string;
  activeNav?: string;
  prerenderShell?: boolean;
  sidebarExtraId?: string;
  mainClass?: string;
}

export interface PpsShellIntegrationOptions {
  /** Fonts + prerendered shell markup for Vite SPA index.html (CMS, roadmap). */
  viteSpaShell?: PpsShellViteSpaOptions;
}

export default function ppsShell(options: PpsShellIntegrationOptions = {}): AstroIntegration {
  return {
    name: "@pps/shell",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        const spa = options.viteSpaShell;
        if (!spa) {
          return;
        }

        const { baseEnvVar, defaultBase, ...pluginOptions } = spa;
        updateConfig({
          vite: {
            plugins: [shellHeadPlugin(baseEnvVar, defaultBase, pluginOptions)],
          },
        });
      },
    },
  };
}

export { shellFontLinksPlugin } from "./vite-font-links.js";
export { shellHeadPlugin, siteRootFromBase } from "./vite-shell-head.js";
