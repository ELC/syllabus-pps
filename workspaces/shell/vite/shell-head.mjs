import { SHELL_FONT_MARKUP } from "./shell-font-links.mjs";
import { renderStaticShell } from "./shell-static-html.mjs";

const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/"];

function normalizeBase(base) {
  return base.endsWith("/") ? base : `${base}/`;
}

export function siteRootFromBase(appBaseUrl, publicSiteRoot) {
  if (publicSiteRoot) {
    return normalizeBase(publicSiteRoot);
  }

  const base = normalizeBase(appBaseUrl);
  for (const suffix of APP_SUFFIXES) {
    if (base.endsWith(suffix)) {
      const trimmed = base.slice(0, -suffix.length);
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }

  return base;
}

export function shellStylesHref(appBaseUrl, publicSiteRoot) {
  const siteRoot = siteRootFromBase(appBaseUrl, publicSiteRoot);
  return `${siteRoot}assets/shell/pps-shell.css`;
}

/**
 * @param {string} baseEnvVar e.g. CMS_BASE
 * @param {string} defaultBase e.g. /cms/
 * @param {{ activeNav?: string, prerenderShell?: boolean, sidebarExtraId?: string, mainClass?: string }} [options]
 * @returns {import('vite').Plugin}
 */
export function shellHeadPlugin(baseEnvVar, defaultBase, options = {}) {
  const { activeNav, prerenderShell = false, sidebarExtraId, mainClass } = options;

  return {
    name: "pps-shell-head",
    transformIndexHtml(html) {
      const appBase = process.env[baseEnvVar] ?? defaultBase;
      const publicSiteRoot = process.env.PUBLIC_SITE_ROOT;
      const shellCss = shellStylesHref(appBase, publicSiteRoot);

      let out = html;
      if (!out.includes("fonts.googleapis.com")) {
        out = out.replace("<head>", `<head>\n${SHELL_FONT_MARKUP}`);
      }
      if (!out.includes("assets/shell/pps-shell.css")) {
        out = out.replace(
          "<head>",
          `<head>\n    <link rel="stylesheet" href="${shellCss}" />`,
        );
      }

      if (prerenderShell && activeNav && !out.includes("dashboard-app")) {
        const siteRoot = siteRootFromBase(appBase, publicSiteRoot);
        const shell = renderStaticShell(activeNav, siteRoot, { sidebarExtraId, mainClass });
        out = out.replace(/<div id="root"><\/div>/, shell);
      }

      return out;
    },
  };
}
