import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OPTIMISTIC_AUTH_BOOTSTRAP_SCRIPT } from "@pps/login/sessionStorage";
import * as sass from "sass";
import type { HtmlTagDescriptor, IndexHtmlTransformHook, Plugin } from "vite";
import { loadEnv } from "vite";

import { googleAnalyticsHeadTags, readGoogleAnalyticsId } from "./google-analytics.js";
import { SHELL_FONT_MARKUP } from "./vite-font-links.js";
import { shellIsologoHref, shellLogoHref } from "./logo-meta.js";
import { renderStaticShell } from "./shell-static-html.js";

const integrationDir = dirname(fileURLToPath(import.meta.url));
const shellRoot = join(integrationDir, "..", "..");
const workspacesRoot = join(shellRoot, "..");
const repoRoot = join(workspacesRoot, "..");

const shellStylesDir = join(shellRoot, "src/styles");

const AUTH_CRITICAL_CSS = sass.compile(
  join(workspacesRoot, "login/src/styles/auth-critical.scss"),
).css;

const SHELL_CHROME_CSS = sass.compile(join(shellStylesDir, "shell.scss"), {
  loadPaths: [shellStylesDir],
}).css;

const LOGIN_CHROME_CSS = sass.compile(join(workspacesRoot, "login/src/styles/login.scss")).css;

const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/", "cites/"];

export interface ShellHeadPluginOptions {
  activeNav?: string;
  prerenderShell?: boolean;
  sidebarExtraId?: string;
  mainClass?: string;
}

function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function siteRootFromBase(appBaseUrl: string): string {
  const base = normalizeBase(appBaseUrl);
  for (const suffix of APP_SUFFIXES) {
    if (base.endsWith(suffix)) {
      const trimmed = base.slice(0, -suffix.length);
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }

  return base;
}

function shellHeadTags(): HtmlTagDescriptor[] {
  return [
    {
      tag: "style",
      attrs: { "data-pps-auth-critical": "" },
      children: AUTH_CRITICAL_CSS,
      injectTo: "head-prepend",
    },
    {
      tag: "script",
      attrs: { "data-pps-optimistic-auth": "" },
      children: OPTIMISTIC_AUTH_BOOTSTRAP_SCRIPT,
      injectTo: "head-prepend",
    },
    {
      tag: "style",
      attrs: { "data-pps-shell-chrome": "" },
      children: SHELL_CHROME_CSS,
      injectTo: "head",
    },
    {
      tag: "style",
      attrs: { "data-pps-login-chrome": "" },
      children: LOGIN_CHROME_CSS,
      injectTo: "head",
    },
  ];
}

export function shellHeadPlugin(
  baseEnvVar: string,
  defaultBase: string,
  options: ShellHeadPluginOptions = {},
): Plugin {
  const { activeNav, prerenderShell = false, sidebarExtraId, mainClass } = options;
  let analyticsHeadTags: HtmlTagDescriptor[] = [];
  let authDisabled = false;

  const siteRootForAssets = (): string => siteRootFromBase(process.env.SITE_BASE ?? "/");
  const logoSrcForSite = (): string => shellLogoHref(siteRootForAssets());
  const isologoSrcForSite = (): string => shellIsologoHref(siteRootForAssets());

  const transformPre: IndexHtmlTransformHook = (html) => {
    const appBase = process.env[baseEnvVar] ?? defaultBase;

    let out = html;
    if (!out.includes("fonts.googleapis.com")) {
      out = out.replace("<head>", `<head>\n${SHELL_FONT_MARKUP}`);
    }

    if (prerenderShell && activeNav && !out.includes("dashboard__sidebar")) {
      const siteRoot = siteRootFromBase(appBase);
      const shell = renderStaticShell(activeNav, siteRoot, {
        sidebarExtraId,
        mainClass,
        logoSrc: logoSrcForSite(),
        isologoSrc: isologoSrcForSite(),
        authDisabled,
      });
      out = out.replace(/<body([^>]*)>/, (match, attrs: string) => {
        if (/class="/i.test(attrs)) {
          return match.replace(/class="([^"]*)"/i, 'class="$1 auth-pending"');
        }
        return `<body${attrs} class="auth-pending">`;
      });
      out = out.replace(/<div id="root"[^>]*><\/div>/, shell);
    }

    return {
      html: out,
      tags: [...shellHeadTags(), ...analyticsHeadTags],
    };
  };

  return {
    name: "pps-shell-head",
    config(_config, { mode }) {
      const env = loadEnv(mode, repoRoot, "");
      authDisabled =
        mode === "development" &&
        (env.PUBLIC_AUTH_DISABLED?.trim().toLowerCase() === "true" ||
          env.PUBLIC_AUTH_DISABLED === "1");
      analyticsHeadTags = googleAnalyticsHeadTags(
        readGoogleAnalyticsId(env),
        mode === "production",
      );
    },
    transformIndexHtml: {
      order: "pre",
      handler: transformPre,
    },
  };
}

/** Keep prerendered SPA brand assets on the site public URL after Vite base rewriting. */
export function shellLogoPostPlugin(): Plugin {
  return {
    name: "pps-shell-head-logo",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const siteRoot = siteRootFromBase(process.env.SITE_BASE ?? "/");
        const logoSrc = shellLogoHref(siteRoot);
        const isologoSrc = shellIsologoHref(siteRoot);
        return html
          .replace(
            /(<img\b[^>]*\bdata-pps-shell-logo\b[^>]*\ssrc=")[^"]*(")/,
            `$1${logoSrc}$2`,
          )
          .replace(
            /(<img\b[^>]*\bdata-pps-shell-isologo\b[^>]*\ssrc=")[^"]*(")/,
            `$1${isologoSrc}$2`,
          );
      },
    },
  };
}
