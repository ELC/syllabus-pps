import type { HtmlTagDescriptor } from "vite";

const GTAG_SRC = "https://www.googletagmanager.com/gtag/js";
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function normalizeGoogleAnalyticsId(raw: string | undefined): string | undefined {
  const id = raw?.trim();
  if (!id || !MEASUREMENT_ID_PATTERN.test(id)) {
    return undefined;
  }

  return id;
}

export function readGoogleAnalyticsId(env: Record<string, string | undefined>): string | undefined {
  return normalizeGoogleAnalyticsId(env.PUBLIC_GA_MEASUREMENT_ID);
}

export function isGoogleAnalyticsEnabled(
  measurementId: string | undefined,
  prod: boolean,
): measurementId is string {
  return Boolean(measurementId && prod);
}

export function googleAnalyticsInitScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${id});`;
}

export function googleAnalyticsHeadTags(
  measurementId: string | undefined,
  prod: boolean,
): HtmlTagDescriptor[] {
  if (!isGoogleAnalyticsEnabled(measurementId, prod)) {
    return [];
  }

  return [
    {
      tag: "script",
      attrs: {
        async: true,
        src: `${GTAG_SRC}?id=${encodeURIComponent(measurementId)}`,
      },
      injectTo: "head",
    },
    {
      tag: "script",
      children: googleAnalyticsInitScript(measurementId),
      injectTo: "head",
    },
  ];
}
