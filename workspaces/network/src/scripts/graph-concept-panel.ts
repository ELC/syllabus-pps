import { loadAnalyticsArtifact } from "@pps/content/browser";
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
  createOpenIconSvg,
  createResourceIconSvg,
} from "@pps/shell/concept-panel-icons";
import { siteRootFromEnv } from "@pps/shell/site-root";
import { cmsCoursePageHref } from "@pps/shell/workspace-links";
import { appendWorkspaceNavLink } from "@pps/shell/workspace-nav-link-dom";

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

function readShowAdminConceptControls(): boolean {
  if (document.documentElement.classList.contains("pps-shell-access-pending")) {
    return false;
  }
  return document.documentElement.classList.contains("pps-role-admin");
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

function createExternalLinkIcon(primaryUrl: string, resolvedTitle: string | undefined, resourceKind: PanelResourceKind): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "graph__concept-note-open";
  link.href = primaryUrl;
  link.setAttribute("aria-label", "Abrir recurso");
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = resolvedTitle
    ? `${panelResourceLabels[resourceKind]}: ${resolvedTitle}`
    : `${panelResourceLabels[resourceKind]}: ${primaryUrl}`;
  link.appendChild(createOpenIconSvg());
  link.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  return link;
}

function renderConceptNote(block: ConceptBlock, showCitesEditLinks: boolean): HTMLElement {
  const item = document.createElement("li");
  item.className = "graph__concept-note";

  const primaryUrl = primaryBlockUrl(block);
  const resourceKind = classifyResourceKind(block);
  const resolvedTitle = block.citations?.[0]?.resolved?.title;
  const resourceId = primaryResourceId(block);
  const body = document.createElement("span");
  body.className = "graph__concept-note-body";
  body.textContent = blockDisplayText(block);

  if (showCitesEditLinks && resourceId) {
    const card = document.createElement("div");
    card.className = "graph__concept-note-card";

    card.appendChild(createResourceMark(resourceKind));

    const action = document.createElement("div");
    action.className = "graph__concept-note-action";
    action.tabIndex = -1;

    const copy = document.createElement("span");
    copy.className = "graph__concept-note-copy";
    copy.append(body);
    action.appendChild(copy);
    card.appendChild(action);

    const rail = document.createElement("div");
    rail.className = "graph__concept-note-rail graph__concept-note-rail--with-edit";
    rail.appendChild(createCitesEditLink(resourceId, resolvedTitle));

    if (primaryUrl) {
      rail.appendChild(createExternalLinkIcon(primaryUrl, resolvedTitle, resourceKind));
    }

    card.appendChild(rail);
    item.appendChild(card);
    return item;
  }

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

function renderConceptNotes(
  notesRoot: HTMLElement,
  blocks: ConceptBlock[],
  showCitesEditLinks: boolean,
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
    list.appendChild(renderConceptNote(block, showCitesEditLinks));
  }

  notesRoot.appendChild(list);
}

function updateConceptCmsLink(cmsLinkRoot: HTMLElement | null, page: ConceptPage | null): void {
  if (!cmsLinkRoot) {
    return;
  }

  cmsLinkRoot.replaceChildren();

  if (!page || !readShowAdminConceptControls()) {
    cmsLinkRoot.hidden = true;
    return;
  }

  cmsLinkRoot.hidden = false;
  const siteRoot = siteRootFromEnv(import.meta.env.BASE_URL ?? "/network/");
  appendWorkspaceNavLink(cmsLinkRoot, {
    navId: "cms",
    label: "Editar",
    href: cmsCoursePageHref(siteRoot, page.slug),
    title: "Editar concepto en el CMS",
  });
}

export async function loadConceptPages(): Promise<Map<string, ConceptPage>> {
  const loaded = await loadAnalyticsArtifact("curriculum-graph.json");
  const payload =
    typeof loaded === "string"
      ? parseGeneratedPayload<{ pages: ConceptPage[] }>(loaded)
      : (loaded as { pages: ConceptPage[] });
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
  const cmsLinkRoot = root.querySelector<HTMLElement>("#graph-concept-cms-link");
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

  const renderCurrentPage = () => {
    if (!currentPage) {
      return;
    }
    const showCitesEditLinks = readShowAdminConceptControls();
    title.textContent = capitalizeWords(currentPage.title);
    renderConceptNotes(notesRoot, currentPage.blocks, showCitesEditLinks);
    updateConceptCmsLink(cmsLinkRoot, currentPage);
  };

  const close = () => {
    currentPage = null;
    updateConceptCmsLink(cmsLinkRoot, null);
    setPanelOpen(false);
  };

  const open = (page: ConceptPage) => {
    currentPage = page;
    renderCurrentPage();
    setPanelOpen(true);
  };

  const roleObserver = new MutationObserver(() => {
    if (currentPage && root.classList.contains("graph__concept-panel--open")) {
      renderCurrentPage();
    }
  });
  roleObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("graph__concept-panel--open")) {
      close();
    }
  });

  return { open, close };
}
