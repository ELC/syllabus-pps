import {
  panelResourceKind,
  panelResourceLabels,
  stripCitationRefs,
  type PanelResourceKind,
  type ResourceCatalogEntry,
} from "@pps/core";

import type { RoadmapStatus } from "../components/roadmap/progress";
import { ROADMAP_STATUS_LABELS } from "../components/roadmap/progress";
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

export interface ConceptPanelProgress {
  resourceStatusFor: (slug: string, line: number) => RoadmapStatus;
  toggleResourceDone: (slug: string, line: number) => void;
  toggleResourceSkipped: (slug: string, line: number) => void;
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
  svg.setAttribute("width", "28");
  svg.setAttribute("height", "28");
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

function createResourceIconSvg(kind: PanelResourceKind): SVGSVGElement {
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

  return svg;
}

function createResourceMark(kind: PanelResourceKind): HTMLElement {
  const mark = document.createElement("span");
  mark.className = `graph__concept-note-mark graph__concept-note-mark--${kind}`;
  mark.setAttribute("aria-hidden", "true");
  mark.appendChild(createResourceIconSvg(kind));
  return mark;
}

function appendResourceLayout(
  container: HTMLElement,
  kind: PanelResourceKind,
  body: HTMLElement,
  statusGlyph?: HTMLElement,
): void {
  container.append(createResourceMark(kind));

  const copy = document.createElement("span");
  copy.className = "graph__concept-note-copy";
  copy.append(body);
  if (statusGlyph) {
    copy.append(statusGlyph);
  }
  container.append(copy);
}

function createOmitIcon(): SVGSVGElement {
  const svg = createSvgRoot();
  svg.classList.add("graph__concept-note-omit-icon");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "8.25");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "1.75");
  svg.appendChild(circle);

  const slash = document.createElementNS("http://www.w3.org/2000/svg", "path");
  slash.setAttribute("d", "M7.5 16.5 16.5 7.5");
  slash.setAttribute("fill", "none");
  slash.setAttribute("stroke", "currentColor");
  slash.setAttribute("stroke-width", "1.75");
  slash.setAttribute("stroke-linecap", "round");
  svg.appendChild(slash);

  return svg;
}

function createOmitButton(
  block: ConceptBlock,
  slug: string,
  status: RoadmapStatus,
  progress: ConceptPanelProgress,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "graph__concept-note-omit",
    status === "skipped" ? "graph__concept-note-omit--active" : "",
  ].join(" ");
  button.title = status === "skipped" ? "Quitar omisión" : "Omitir recurso";
  button.setAttribute(
    "aria-label",
    status === "skipped"
      ? "Quitar omisión del recurso"
      : "Omitir recurso",
  );
  button.appendChild(createOmitIcon());
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    progress.toggleResourceSkipped(slug, block.line);
  });
  return button;
}

function createExternalLinkIcon(): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "graph__concept-note-open";
  link.setAttribute("aria-label", "Abrir recurso");
  link.title = "Abrir recurso";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const svg = createSvgRoot();
  svg.classList.add("graph__concept-note-open-icon");
  appendFilledPath(
    svg,
    "M14 3.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V5.56l-6.22 6.22a.75.75 0 1 1-1.06-1.06l6.22-6.22h-1.94a.75.75 0 0 1 0-1.5h3.5a.75.75 0 0 1 .75.75Zm-8.5 4a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 5.75 21h9A2.25 2.25 0 0 0 17 18.75v-4.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 0 0-1.5h-4.5Z",
  );
  link.appendChild(svg);
  return link;
}

function renderConceptNote(
  block: ConceptBlock,
  slug: string,
  progress?: ConceptPanelProgress,
): HTMLElement {
  const item = document.createElement("li");
  item.className = "graph__concept-note";

  const primaryUrl = primaryBlockUrl(block);
  const resourceKind = classifyResourceKind(block);
  const resolvedTitle = block.citations?.[0]?.resolved?.title;
  const body = document.createElement("span");
  body.className = "graph__concept-note-body";
  body.textContent = blockDisplayText(block);

  if (!progress) {
    if (!primaryUrl) {
      const content = document.createElement("div");
      content.className = "graph__concept-note-static";
      appendResourceLayout(content, resourceKind, body);
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
    appendResourceLayout(link, resourceKind, body);
    item.appendChild(link);
    return item;
  }

  const status = progress.resourceStatusFor(slug, block.line);
  const card = document.createElement("div");
  card.className = [
    "graph__concept-note-card",
    `graph__concept-note-card--${status}`,
  ].join(" ");

  card.appendChild(createResourceMark(resourceKind));

  const action = document.createElement("button");
  action.type = "button";
  action.className = "graph__concept-note-action";
  action.title =
    status === "done"
      ? "Marcar como pendiente"
      : status === "skipped"
        ? "Marcar como hecho"
        : "Marcar como hecho";
  action.setAttribute(
    "aria-label",
    `${blockDisplayText(block) || resolvedTitle || "Recurso"}: ${ROADMAP_STATUS_LABELS[status]}. ${
      status === "done" ? "Marcar como pendiente" : "Marcar como hecho"
    }`,
  );

  const statusGlyph = document.createElement("span");
  statusGlyph.className = "graph__concept-note-status";
  statusGlyph.setAttribute("aria-hidden", "true");
  statusGlyph.textContent = status === "done" ? "✓" : "";

  const copy = document.createElement("span");
  copy.className = "graph__concept-note-copy";
  copy.append(body, statusGlyph);
  action.appendChild(copy);

  action.addEventListener("click", () => {
    progress.toggleResourceDone(slug, block.line);
  });

  const rail = document.createElement("div");
  rail.className = "graph__concept-note-rail";

  if (primaryUrl) {
    const openLink = createExternalLinkIcon();
    openLink.href = primaryUrl;
    openLink.title = resolvedTitle
      ? `${panelResourceLabels[resourceKind]}: ${resolvedTitle}`
      : `${panelResourceLabels[resourceKind]}: ${primaryUrl}`;
    rail.appendChild(openLink);
  } else {
    rail.classList.add("graph__concept-note-rail--omit-only");
  }

  rail.appendChild(createOmitButton(block, slug, status, progress));
  card.append(action, rail);
  item.appendChild(card);
  return item;
}

function renderConceptNotes(
  notesRoot: HTMLElement,
  blocks: ConceptBlock[],
  slug: string,
  progress?: ConceptPanelProgress,
): void {
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
    list.appendChild(renderConceptNote(block, slug, progress));
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

export interface ConceptPanelCloseOptions {
  updateUrl?: boolean;
}

export interface ConceptPanel {
  open: (page: ConceptPage) => void;
  close: (options?: ConceptPanelCloseOptions) => void;
  refresh: () => void;
}

export interface ConceptPanelHandlers {
  onClose?: () => void;
}

export function mountConceptPanel(
  root: HTMLElement,
  progress?: ConceptPanelProgress,
  handlers?: ConceptPanelHandlers,
): ConceptPanel {
  const title = root.querySelector<HTMLElement>(".graph__concept-title");
  const notesRoot = root.querySelector<HTMLElement>(".graph__concept-body");
  const closeButton = root.querySelector<HTMLButtonElement>(".graph__concept-close");
  const backdrop = root.querySelector<HTMLElement>(".graph__concept-backdrop");
  const sheet = root.querySelector<HTMLElement>(".graph__concept-sheet");

  if (!title || !notesRoot || !closeButton || !backdrop || !sheet) {
    throw new Error("Concept panel markup is incomplete");
  }

  let currentPage: ConceptPage | null = null;

  const setPanelOpen = (open: boolean) => {
    root.classList.toggle("graph__concept-panel--open", open);
    backdrop.classList.toggle("graph__concept-backdrop--open", open);
    sheet.classList.toggle("graph__concept-sheet--open", open);
    root.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const refresh = () => {
    if (!currentPage) {
      return;
    }

    renderConceptNotes(notesRoot, currentPage.blocks, currentPage.slug, progress);
  };

  const close = (options?: ConceptPanelCloseOptions) => {
    currentPage = null;
    setPanelOpen(false);
    if (options?.updateUrl !== false) {
      handlers?.onClose?.();
    }
  };

  const open = (page: ConceptPage) => {
    currentPage = page;
    title.textContent = capitalizeWords(page.title);
    renderConceptNotes(notesRoot, page.blocks, page.slug, progress);
    setPanelOpen(true);
  };

  closeButton.addEventListener("click", () => close());
  backdrop.addEventListener("click", () => close());

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("graph__concept-panel--open")) {
      close();
    }
  });

  return { open, close, refresh };
}
