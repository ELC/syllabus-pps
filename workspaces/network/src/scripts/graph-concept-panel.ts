import {
  panelResourceKind,
  panelResourceLabels,
  stripCitationRefs,
  type PanelResourceKind,
  type ResourceCatalogEntry,
} from "@pps/core";
import { createResourceIconSvg } from "@pps/shell/concept-panel-icons";

import { capitalizeWords } from "./graph-styles";

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
): void {
  container.append(createResourceMark(kind));

  const copy = document.createElement("span");
  copy.className = "graph__concept-note-copy";
  copy.append(body);
  container.append(copy);
}

function renderConceptNote(block: ConceptBlock): HTMLElement {
  const item = document.createElement("li");
  item.className = "graph__concept-note";

  const primaryUrl = primaryBlockUrl(block);
  const resourceKind = classifyResourceKind(block);
  const resolvedTitle = block.citations?.[0]?.resolved?.title;
  const body = document.createElement("span");
  body.className = "graph__concept-note-body";
  body.textContent = blockDisplayText(block);

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
