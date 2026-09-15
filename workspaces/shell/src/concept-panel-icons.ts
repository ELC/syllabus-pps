import type { PanelResourceKind } from "@pps/core";

import bookSvg from "../assets/icons/resource-book.svg?raw";
import interactiveSvg from "../assets/icons/resource-interactive.svg?raw";
import omitSvg from "../assets/icons/resource-omit.svg?raw";
import openSvg from "../assets/icons/resource-open.svg?raw";
import textSvg from "../assets/icons/resource-text.svg?raw";
import videoSvg from "../assets/icons/resource-video.svg?raw";
import wikipediaSvg from "../assets/icons/resource-wikipedia.svg?raw";

const RESOURCE_ICON_SVGS: Record<PanelResourceKind, string> = {
  video: videoSvg,
  wikipedia: wikipediaSvg,
  book: bookSvg,
  interactive: interactiveSvg,
  text: textSvg,
};

function parseSvgMarkup(raw: string, ...classNames: string[]): SVGSVGElement {
  const doc = new DOMParser().parseFromString(raw.trim(), "image/svg+xml");
  const svg = doc.documentElement;

  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("Invalid SVG markup");
  }

  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("focusable", "false");

  for (const className of classNames) {
    svg.classList.add(className);
  }

  return svg;
}

export function createResourceIconSvg(kind: PanelResourceKind): SVGSVGElement {
  return parseSvgMarkup(RESOURCE_ICON_SVGS[kind], "graph__concept-note-icon");
}

export function createOmitIconSvg(): SVGSVGElement {
  return parseSvgMarkup(omitSvg, "graph__concept-note-icon", "graph__concept-note-omit-icon");
}

export function createOpenIconSvg(): SVGSVGElement {
  return parseSvgMarkup(openSvg, "graph__concept-note-icon", "graph__concept-note-open-icon");
}
