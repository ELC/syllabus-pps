import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OPTIMISTIC_AUTH_BOOTSTRAP_SCRIPT } from "@pps/login/sessionStorage";
import type { HtmlTagDescriptor, IndexHtmlTransformHook, Plugin } from "vite";

import { SHELL_FONT_MARKUP } from "./vite-font-links.js";
import { renderStaticShell } from "./shell-static-html.js";

const integrationDir = dirname(fileURLToPath(import.meta.url));
const shellRoot = join(integrationDir, "..", "..");
const workspacesRoot = join(shellRoot, "..");

const AUTH_CRITICAL_CSS = readFileSync(
  join(workspacesRoot, "login/src/styles/auth-critical.css"),
  "utf8",
);

const APP_SUFFIXES = ["analytics/", "network/", "roadmap/", "cms/"];
const SHELL_LOGO_PATH = "assets/shell/logo-horizontal-blanco.png";

function shellLogoHref(siteRoot: string): string {
  const root = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  return `${root}${SHELL_LOGO_PATH}`;
}

export interface ShellHeadPluginOptions {
  activeNav?: string;
  prerenderShell?: boolean;
  sidebarExtraId?: string;
  mainClass?: string;
}

function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

function devFsAssetHref(absolutePath: string): string {
  return `@fs/${absolutePath.replace(/\\/g, "/")}`;
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
  const shellCss = join(shellRoot, "src/styles/shell.css");
  const loginCss = join(workspacesRoot, "login/src/styles/login.css");

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
      tag: "link",
      attrs: { rel: "stylesheet", href: devFsAssetHref(shellCss) },
      injectTo: "head",
    },
    {
      tag: "link",
      attrs: { rel: "stylesheet", href: devFsAssetHref(loginCss) },
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

  const logoSrcForSite = (): string =>
    shellLogoHref(siteRootFromBase(process.env.SITE_BASE ?? "/"));

  const transformPre: IndexHtmlTransformHook = (html) => {
    const appBase = process.env[baseEnvVar] ?? defaultBase;

    let out = html;
    if (!out.includes("fonts.googleapis.com")) {
      out = out.replace("<head>", `<head>\n${SHELL_FONT_MARKUP}`);
    }

    if (prerenderShell && activeNav && !out.includes("dashboard-app")) {
      const siteRoot = siteRootFromBase(appBase);
      const shell = renderStaticShell(activeNav, siteRoot, {
        sidebarExtraId,
        mainClass,
        logoSrc: logoSrcForSite(),
      });
      out = out.replace(/<body([^>]*)>/, (match, attrs: string) => {
        if (/class="/i.test(attrs)) {
          return match.replace(/class="([^"]*)"/i, 'class="$1 auth-pending"');
        }
        return `<body${attrs} class="auth-pending">`;
      });
      out = out.replace(/<div id="root"><\/div>/, shell);
    }

    return {
      html: out,
      tags: shellHeadTags(),
    };
  };

  return {
    name: "pps-shell-head",
    transformIndexHtml: {
      order: "pre",
      handler: transformPre,
    },
  };
}

/** Keep prerendered SPA logos on the site public URL after Vite base rewriting. */
export function shellLogoPostPlugin(): Plugin {
  return {
    name: "pps-shell-head-logo",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const logoSrc = shellLogoHref(siteRootFromBase(process.env.SITE_BASE ?? "/"));
        return html.replace(
          /(<img\b[^>]*\bdata-pps-shell-logo\b[^>]*\ssrc=")[^"]*(")/,
          `$1${logoSrc}$2`,
        );
      },
    },
  };
}
