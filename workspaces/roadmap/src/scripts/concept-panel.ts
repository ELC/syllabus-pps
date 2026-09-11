import { isBookSource } from "@pps/core";

import { capitalizeWords } from "./labels";

interface ConceptUrlLink {
  raw: string;
  target: string;
}

interface ConceptBlock {
  line: number;
  text: string;
  urls: ConceptUrlLink[];
}

export interface ConceptPage {
  slug: string;
  title: string;
  kind: string;
  blocks: ConceptBlock[];
}

type ResourceKind = "video" | "wikipedia" | "text" | "book" | "interactive";

const RESOURCE_LABELS: Record<ResourceKind, string> = {
  video: "Video",
  wikipedia: "Wikipedia",
  text: "Texto",
  book: "Libro",
  interactive: "Interactivo",
};

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

function primaryBlockUrl(urls: ConceptUrlLink[]): string | undefined {
  return urls[0]?.target;
}

function classifyResourceKind(text: string, url?: string): ResourceKind {
  const normalizedUrl = url?.toLowerCase() ?? "";

  if (normalizedUrl.includes("wikipedia.org") || /\bwikipedia\b/i.test(text)) {
    return "wikipedia";
  }

  if (
    /youtube\.com|youtu\.be|vimeo\.com/.test(normalizedUrl) ||
    /\b(video|playlist)\b/i.test(text)
  ) {
    return "video";
  }

  if (isBookSource(text, url)) {
    return "book";
  }

  if (
    /db-fiddle|replit\.com|repl\.it|codecademy|exercism|observablehq|sqlfiddle|jsfiddle|codesandbox|scratch\.mit\.edu/.test(
      normalizedUrl,
    ) ||
    /\b(interactivo|interactive|simulador|sandbox|playground|fiddle|experiment)\b/i.test(text)
  ) {
    return "interactive";
  }

  return "text";
}

function blockDisplayText(text: string, primaryUrl?: string): string {
  if (!primaryUrl) {
    return text;
  }

  let display = text.trim();
  if (display.endsWith(primaryUrl)) {
    display = display.slice(0, -primaryUrl.length).trim();
  } else {
    display = display.replace(primaryUrl, "").trim();
  }

  return display;
}

function createSvgRoot(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("focusable", "false");
  svg.classList.add("graph-concept-note-icon");
  return svg;
}

function appendFilledPath(svg: SVGSVGElement, pathData: string): void {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
}

function createResourceIcon(kind: ResourceKind): HTMLElement {
  const badge = document.createElement("span");
  badge.className = `graph-concept-note-icon-badge graph-concept-note-icon-badge--${kind}`;
  badge.setAttribute("aria-hidden", "true");

  const svg = createSvgRoot();

  switch (kind) {
    case "video": {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "9");
      circle.setAttribute("fill", "currentColor");
      circle.setAttribute("opacity", "0.18");
      svg.appendChild(circle);

      appendFilledPath(svg, "M10.25 8.25v7.5l6.75-3.75-6.75-3.75Z");
      break;
    }
    case "wikipedia": {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "9");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "currentColor");
      circle.setAttribute("stroke-width", "1.75");
      svg.appendChild(circle);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", "12");
      label.setAttribute("y", "16");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "currentColor");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "700");
      label.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
      label.textContent = "W";
      svg.appendChild(label);
      break;
    }
    case "book":
      appendFilledPath(
        svg,
        "M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75v13.5c-.85-.55-1.86-.88-2.95-.88-1.55 0-2.95.62-3.97 1.62A5.46 5.46 0 0 0 6.75 18.5c-1.09 0-2.1.33-2.95.88V4.75Zm2.75-.5c-.69 0-1.25.56-1.25 1.25V17.1c.55-.22 1.15-.35 1.75-.35 1.55 0 2.95.62 3.97 1.62.45-.42.98-.75 1.53-.98V4.5H8.75Z",
      );
      break;
    case "interactive":
      appendFilledPath(
        svg,
        "M13 2.05a1 1 0 0 1 .98 1.2l-.55 3.08a1 1 0 0 0 1.18 1.18l3.08-.55a1 1 0 0 1 1.15 1.42l-7.7 13.35a1 1 0 0 1-1.74-.02l-2.2-3.8a1 1 0 0 0-.18-1.16l-3.3-1.9a1 1 0 0 1 1.16-1.62l3.08.55a1 1 0 0 0 1.18-1.18l-.55-3.08a1 1 0 0 1 1.2-.98h3.8Z",
      );
      break;
    default:
      appendFilledPath(
        svg,
        "M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v12.5A2.25 2.25 0 0 1 15.75 18.5h-7.5A2.25 2.25 0 0 1 6 16.25V3.75Zm2.25-.75a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-7.5ZM9 7.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 7.5Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 10.5Zm0 3a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 9 13.5Z",
      );
      break;
  }

  badge.appendChild(svg);
  return badge;
}

function renderConceptNote(block: ConceptBlock): HTMLElement {
  const item = document.createElement("li");
  item.className = "graph-concept-note";

  const primaryUrl = primaryBlockUrl(block.urls);
  const resourceKind = classifyResourceKind(block.text, primaryUrl);
  const body = document.createElement("div");
  body.className = "graph-concept-note-body";
  body.textContent = blockDisplayText(block.text, primaryUrl);

  if (!primaryUrl) {
    const content = document.createElement("div");
    content.className = "graph-concept-note-static";
    content.append(createResourceIcon(resourceKind), body);
    item.appendChild(content);
    return item;
  }

  const link = document.createElement("a");
  link.className = "graph-concept-note-link";
  link.href = primaryUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = `${RESOURCE_LABELS[resourceKind]}: ${primaryUrl}`;
  link.append(createResourceIcon(resourceKind), body);
  item.appendChild(link);
  return item;
}

function renderConceptNotes(notesRoot: HTMLElement, blocks: ConceptBlock[]): void {
  notesRoot.replaceChildren();

  if (blocks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "graph-concept-panel-empty";
    empty.textContent = "Esta concept page no tiene notas todavía.";
    notesRoot.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "graph-concept-notes";

  for (const block of blocks) {
    list.appendChild(renderConceptNote(block));
  }

  notesRoot.appendChild(list);
}

export async function loadConceptPages(dataUrl: string): Promise<Map<string, ConceptPage>> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load concept pages (${response.status})`);
  }

  const payload = parseGeneratedPayload<{ pages: ConceptPage[] }>(await response.text());
  const pagesBySlug = new Map<string, ConceptPage>();

  for (const page of payload.pages) {
    if (page.kind !== "concept") {
      continue;
    }

    pagesBySlug.set(page.slug, page);
  }

  return pagesBySlug;
}

export interface ConceptPanel {
  open: (page: ConceptPage) => void;
  close: () => void;
}

export function mountConceptPanel(root: HTMLElement): ConceptPanel {
  const title = root.querySelector<HTMLElement>("#graph-concept-panel-title");
  const notesRoot = root.querySelector<HTMLElement>("#graph-concept-panel-notes");
  const closeButton = root.querySelector<HTMLButtonElement>(".graph-concept-panel-close");
  const backdrop = root.querySelector<HTMLElement>(".graph-concept-panel-backdrop");

  if (!title || !notesRoot || !closeButton || !backdrop) {
    throw new Error("Concept panel markup is incomplete");
  }

  const close = () => {
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
  };

  const open = (page: ConceptPage) => {
    title.textContent = capitalizeWords(page.title);
    renderConceptNotes(notesRoot, page.blocks);
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
  };

  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) {
      close();
    }
  });

  return { open, close };
}
