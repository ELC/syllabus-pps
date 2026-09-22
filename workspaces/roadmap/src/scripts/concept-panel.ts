import {
  panelResourceKind,
  panelResourceLabels,
  stripCitationRefs,
  type PanelResourceKind,
  type ResourceCatalogEntry,
} from "@pps/core";
import { citesEditHref } from "@pps/shell/cites-link";
import {
  createEditIconSvg,
  createOmitIconSvg,
  createOpenIconSvg,
  createResourceIconSvg,
} from "@pps/shell/concept-panel-icons";

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

function primaryResourceId(block: ConceptBlock): string | undefined {
  const id = block.citations?.[0]?.id?.trim();
  return id || undefined;
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
  button.appendChild(createOmitIconSvg());
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

  link.appendChild(createOpenIconSvg());
  return link;
}

function createCitesEditLink(resourceId: string, title?: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "graph__concept-note-edit";
  const label = title ? `Editar en Cites: ${title}` : "Editar en Cites";
  link.href = citesEditHref(resourceId);
  link.title = label;
  link.setAttribute("aria-label", label);
  link.appendChild(createEditIconSvg());
  link.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  return link;
}

function renderConceptNote(
  block: ConceptBlock,
  slug: string,
  progress?: ConceptPanelProgress,
  showCitesEditLinks = false,
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
  const resourceId = primaryResourceId(block);

  if (resourceId && showCitesEditLinks) {
    rail.classList.add("graph__concept-note-rail--with-edit");
    rail.appendChild(createCitesEditLink(resourceId, resolvedTitle));
  }

  if (primaryUrl) {
    const openLink = createExternalLinkIcon();
    openLink.href = primaryUrl;
    openLink.title = resolvedTitle
      ? `${panelResourceLabels[resourceKind]}: ${resolvedTitle}`
      : `${panelResourceLabels[resourceKind]}: ${primaryUrl}`;
    openLink.addEventListener("click", (event) => {
      event.stopPropagation();
    });
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
  showCitesEditLinks = false,
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
    list.appendChild(renderConceptNote(block, slug, progress, showCitesEditLinks));
  }

  notesRoot.appendChild(list);
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

export interface ConceptPanelOptions {
  handlers?: ConceptPanelHandlers;
  showCitesEditLinks?: boolean;
}

export function mountConceptPanel(
  root: HTMLElement,
  progress?: ConceptPanelProgress,
  options?: ConceptPanelOptions | ConceptPanelHandlers,
): ConceptPanel {
  const resolvedOptions: ConceptPanelOptions =
    options && "handlers" in options
      ? options
      : options && "onClose" in options
        ? { handlers: options }
        : (options ?? {});
  const handlers = resolvedOptions.handlers;
  const showCitesEditLinks = resolvedOptions.showCitesEditLinks ?? false;
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

    renderConceptNotes(notesRoot, currentPage.blocks, currentPage.slug, progress, showCitesEditLinks);
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
    renderConceptNotes(notesRoot, page.blocks, page.slug, progress, showCitesEditLinks);
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
