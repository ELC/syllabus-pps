import {
  panelResourceKind,
  panelResourceLabels,
  stripCitationRefs,
  type PanelResourceKind,
  type ResourceCatalogEntry,
} from "@pps/core";

import { capitalizeWords } from "./labels";

interface ConceptUrlLink {
  raw: string;
  target: string;
}

interface ConceptCitation {
  raw: string;
  id: string;
  resolved?: ResourceCatalogEntry;
}

interface ConceptBlock {
  line: number;
  text: string;
  urls: ConceptUrlLink[];
  citations?: ConceptCitation[];
}

export interface ConceptPage {
  slug: string;
  title: string;
  kind: string;
  blocks: ConceptBlock[];
}

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

function primaryBlockUrl(block: ConceptBlock): string | undefined {
  return block.citations?.[0]?.resolved?.URL ?? block.urls[0]?.target;
}

function classifyResourceKind(block: ConceptBlock): PanelResourceKind {
  const resolved = block.citations?.[0]?.resolved;
  if (resolved) {
    return panelResourceKind(resolved);
  }

  return "text";
}

function blockDisplayText(block: ConceptBlock): string {
  const primaryUrl = primaryBlockUrl(block);
  let display = stripCitationRefs(block.text).trim();

  if (primaryUrl && display.endsWith(primaryUrl)) {
    display = display.slice(0, -primaryUrl.length).trim();
  }

  return display;
}

function createSvgRoot(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("focusable", "false");
  svg.classList.add("graph__concept-note-icon");
  return svg;
}

function appendFilledPath(svg: SVGSVGElement, pathData: string): void {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
}

function createResourceIcon(kind: PanelResourceKind): HTMLElement {
  const badge = document.createElement("span");
  badge.className = `graph__concept-note-badge graph__concept-note-badge--${kind}`;
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
  item.className = "graph__concept-note";

  const primaryUrl = primaryBlockUrl(block);
  const resourceKind = classifyResourceKind(block);
  const resolvedTitle = block.citations?.[0]?.resolved?.title;
  const body = document.createElement("div");
  body.className = "graph__concept-note-body";
  body.textContent = blockDisplayText(block);

  if (!primaryUrl) {
    const content = document.createElement("div");
    content.className = "graph__concept-note-static";
    content.append(createResourceIcon(resourceKind), body);
    item.appendChild(content);
    return item;
  }

  const link = document.createElement("a");
  link.className = "graph__concept-note-link";
  link.href = primaryUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = resolvedTitle
    ? `${panelResourceLabels[resourceKind]}: ${resolvedTitle}`
    : `${panelResourceLabels[resourceKind]}: ${primaryUrl}`;
  link.append(createResourceIcon(resourceKind), body);
  item.appendChild(link);
  return item;
}

function renderConceptNotes(notesRoot: HTMLElement, blocks: ConceptBlock[]): void {
  notesRoot.replaceChildren();

  if (blocks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "graph__concept-empty";
    empty.textContent = "Esta concept page no tiene notas todavía.";
    notesRoot.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "graph__concept-note-list";

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
  const title = root.querySelector<HTMLElement>(".graph__concept-title");
  const notesRoot = root.querySelector<HTMLElement>(".graph__concept-body");
  const closeButton = root.querySelector<HTMLButtonElement>(".graph__concept-close");
  const backdrop = root.querySelector<HTMLElement>(".graph__concept-backdrop");
  const sheet = root.querySelector<HTMLElement>(".graph__concept-sheet");

  if (!title || !notesRoot || !closeButton || !backdrop || !sheet) {
    throw new Error("Concept panel markup is incomplete");
  }

  const setPanelOpen = (open: boolean) => {
    root.classList.toggle("graph__concept-panel--open", open);
    backdrop.classList.toggle("graph__concept-backdrop--open", open);
    sheet.classList.toggle("graph__concept-sheet--open", open);
    root.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const close = () => {
    setPanelOpen(false);
  };

  const open = (page: ConceptPage) => {
    title.textContent = capitalizeWords(page.title);
    renderConceptNotes(notesRoot, page.blocks);
    setPanelOpen(true);
  };

  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("graph__concept-panel--open")) {
      close();
    }
  });

  return { open, close };
}
