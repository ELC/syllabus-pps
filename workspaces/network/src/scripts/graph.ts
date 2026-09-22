import { loadAnalyticsArtifact } from "@pps/content/browser";
import { isTrayectoNoEstructurado, structuralPageKindRank } from "@pps/core";
import { fetchIsAppAdmin } from "@pps/login/appAdminApi";
import { isAuthDisabled } from "@pps/login/authDisabled";
import { createBrowserClient } from "@pps/login/client";
import { isMissingConfig, readSupabaseConfig } from "@pps/login/config";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

import {
  type ConceptPage,
  loadConceptPages,
  mountConceptPanel,
} from "./graph-concept-panel";
import {
  AUSTRAL,
  expansionShadesForBase,
  AUSTRAL_GRAPH_TNE,
  courseNodeStyle,
  kindStyleForKind,
} from "@pps/shell/austral-tokens";
import { siteRootFromEnv } from "@pps/shell/site-root";
import {
  capitalizeWords,
  formatGraphNodeLabel,
  GRAPH_FILTER_KINDS,
  GRAPH_NODE_KINDS,
} from "./graph-styles";
import {
  DEFAULT_GRAPH_CONCEPTS_HIDDEN,
  DEFAULT_GRAPH_COURSE_LINK_MODE,
  DEFAULT_GRAPH_YEARS_HIDDEN,
  parseGraphUrlState,
  writeGraphUrlState,
  type CourseLinkMode,
  type GraphUrlState,
} from "./graph-url";

export { GRAPH_FILTER_KINDS, GRAPH_NODE_KINDS };

cytoscape.use(fcose);

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

export interface MountGraphOptions {
  cmsBase?: string;
  filtersRootId?: string;
  searchInputId?: string;
  searchResultsId?: string;
  expansionListId?: string;
  refreshButtonId?: string;
  resetFiltersButtonId?: string;
  toggleConceptsButtonId?: string;
  toggleYearsButtonId?: string;
  toggleCourseLinksButtonId?: string;
  conceptPanelId?: string;
}

type KindFilterKey = (typeof GRAPH_FILTER_KINDS)[number]["kind"];

type KindFilters = Record<KindFilterKey, string>;

interface GraphUi {
  expansionListRoot: HTMLElement | null;
  syncView: (fit?: boolean) => void;
}

function defaultCmsBase(): string {
  const siteRoot = siteRootFromEnv(import.meta.env.BASE_URL ?? "/network/");
  return `${siteRoot}cms/`;
}

function cmsUrlForSlug(cmsBase: string, slug: string): string {
  const url = new URL(cmsBase, window.location.origin);
  url.searchParams.set("page", slug);
  return url.toString();
}

function openInCms(cmsBase: string, slug: string): void {
  window.open(cmsUrlForSlug(cmsBase, slug), "_blank", "noopener,noreferrer");
}

interface GraphViewState {
  fullGraphPositions: Map<string, cytoscape.Position> | null;
  initialLayoutSaved: boolean;
  expansionNodeIds: string[] | null;
  expansionAnchorColors: Map<string, string>;
  focusedNodeId: string | null;
  focusLayoutCache: Map<string, Map<string, cytoscape.Position>>;
  kindFilters: KindFilters;
  searchQuery: string;
  conceptsHidden: boolean;
  yearsHidden: boolean;
  courseLinkMode: CourseLinkMode;
}

function createKindFilters(): KindFilters {
  return {
    degree: "",
    year: "",
    course: "",
    concept: "",
  };
}

function nodeSlug(node: cytoscape.NodeSingular): string | undefined {
  const slug = node.data("slug");
  return typeof slug === "string" && slug.length > 0 ? slug : undefined;
}

function findNodeBySlug(cy: cytoscape.Core, slug: string): cytoscape.NodeSingular | undefined {
  const found = cy.nodes().filter((node) => node.isNode() && nodeSlug(node) === slug);
  if (found.empty() || !found[0]?.isNode()) {
    return undefined;
  }

  return found[0];
}

function urlStateFromViewState(cy: cytoscape.Core, viewState: GraphViewState): GraphUrlState {
  const filterSlugs = createKindFilters();

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const nodeId = viewState.kindFilters[kind];
    if (!nodeId) {
      continue;
    }

    const node = cy.getElementById(nodeId);
    const slug = node.nonempty() && node.isNode() ? nodeSlug(node) : undefined;
    if (slug) {
      filterSlugs[kind] = slug;
    }
  }

  const expansionSlugs = (viewState.expansionNodeIds ?? [])
    .map((nodeId) => {
      const node = cy.getElementById(nodeId);
      return node.nonempty() && node.isNode() ? nodeSlug(node) : undefined;
    })
    .filter((slug): slug is string => Boolean(slug));

  return {
    expansionSlugs,
    filterSlugs,
    conceptsHidden: viewState.conceptsHidden,
    yearsHidden: viewState.yearsHidden,
    courseLinkMode: viewState.courseLinkMode,
  };
}

function applyUrlStateToViewState(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  urlState: GraphUrlState,
): boolean {
  const kindFilters = createKindFilters();
  let restored = false;

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const slug = urlState.filterSlugs[kind];
    if (!slug) {
      continue;
    }

    const node = findNodeBySlug(cy, slug);
    if (!node) {
      continue;
    }

    kindFilters[kind] = node.id();
    restored = true;
  }

  const expansionNodeIds = urlState.expansionSlugs
    .map((slug) => findNodeBySlug(cy, slug)?.id())
    .filter((nodeId): nodeId is string => Boolean(nodeId));

  viewState.kindFilters = kindFilters;
  viewState.conceptsHidden = urlState.conceptsHidden;
  viewState.yearsHidden = urlState.yearsHidden;
  viewState.courseLinkMode = urlState.courseLinkMode;
  viewState.expansionNodeIds = expansionNodeIds.length > 0 ? expansionNodeIds : null;
  viewState.focusedNodeId =
    expansionNodeIds.length > 0 ? expansionNodeIds[expansionNodeIds.length - 1]! : null;

  return restored || expansionNodeIds.length > 0;
}

function applyRestoredUrlView(cy: cytoscape.Core, viewState: GraphViewState, ui: GraphUi): void {
  if (isExpansionActive(viewState)) {
    for (const nodeId of viewState.expansionNodeIds ?? []) {
      assignExpansionAnchorColor(cy, viewState, nodeId);
    }

    const focusNode = viewState.focusedNodeId
      ? cy.getElementById(viewState.focusedNodeId)
      : undefined;

    applyFocusView(cy, viewState, ui, {
      randomize: true,
      focusNode: focusNode?.nonempty() && focusNode.isNode() ? focusNode : undefined,
    });
    return;
  }

  ui.syncView();
  refreshGraphLayout(cy, viewState);
}

const ELASTIC_NEIGHBOR_DRAG_FACTOR = 0.35;

interface ElasticNeighborDragState {
  grabbedNodeId: string;
  grabbedStart: cytoscape.Position;
  neighborStarts: Map<string, cytoscape.Position>;
}

function captureElasticDragState(node: cytoscape.NodeSingular): ElasticNeighborDragState {
  const neighborStarts = new Map<string, cytoscape.Position>();

  node.neighborhood("node").forEach((neighbor) => {
    if (neighbor.id() === node.id()) {
      return;
    }

    neighborStarts.set(neighbor.id(), { ...neighbor.position() });
  });

  return {
    grabbedNodeId: node.id(),
    grabbedStart: { ...node.position() },
    neighborStarts,
  };
}

function applyElasticNeighborDrag(
  cy: cytoscape.Core,
  node: cytoscape.NodeSingular,
  state: ElasticNeighborDragState,
): void {
  const current = node.position();
  const dx = current.x - state.grabbedStart.x;
  const dy = current.y - state.grabbedStart.y;

  for (const [neighborId, start] of state.neighborStarts) {
    const neighbor = cy.getElementById(neighborId);
    if (neighbor.empty() || neighbor.hasClass("filtered-out")) {
      continue;
    }

    neighbor.position({
      x: start.x + dx * ELASTIC_NEIGHBOR_DRAG_FACTOR,
      y: start.y + dy * ELASTIC_NEIGHBOR_DRAG_FACTOR,
    });
  }
}

function snapshotPositions(cy: cytoscape.Core): Map<string, cytoscape.Position> {
  const positions = new Map<string, cytoscape.Position>();

  cy.nodes().forEach((node) => {
    positions.set(node.id(), { ...node.position() });
  });

  return positions;
}

function restorePositions(cy: cytoscape.Core, positions: Map<string, cytoscape.Position>): void {
  cy.nodes().forEach((node) => {
    const saved = positions.get(node.id());
    if (saved) {
      node.position(saved);
    }
  });
}

function expansionSessionKey(expansionNodeIds: string[]): string {
  return [...expansionNodeIds].sort(compareNodes).join("|");
}

function persistCurrentPositions(cy: cytoscape.Core, viewState: GraphViewState): void {
  const positions = snapshotPositions(cy);

  if (viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0) {
    viewState.focusLayoutCache.set(expansionSessionKey(viewState.expansionNodeIds), positions);
  }

  if (viewState.fullGraphPositions) {
    for (const [nodeId, position] of positions) {
      viewState.fullGraphPositions.set(nodeId, position);
    }
  }
}

function visibleNodeIdsForExpansions(
  cy: cytoscape.Core,
  expansionNodeIds: string[],
): Set<string> {
  const visibleNodeIds = new Set<string>();

  for (const nodeId of expansionNodeIds) {
    const node = cy.getElementById(nodeId);
    if (node.empty() || !node.isNode()) {
      continue;
    }

    inducedNodeIdsForNode(node).forEach((visibleNodeId) => {
      visibleNodeIds.add(visibleNodeId);
    });
  }

  return visibleNodeIds;
}

function inducedNodeIdsForNode(node: cytoscape.NodeSingular): Set<string> {
  const nodeIds = new Set<string>();
  node.closedNeighborhood().nodes().forEach((neighbor) => {
    nodeIds.add(neighbor.id());
  });
  return nodeIds;
}

function visibleLayoutElements(
  cy: cytoscape.Core,
  viewState: GraphViewState,
): cytoscape.Collection {
  applyElementVisibility(cy, viewState);
  return cy.elements().not(".filtered-out");
}

function visibleLayoutSubgraph(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  nodeIds: Set<string>,
): cytoscape.Collection {
  const visible = visibleLayoutElements(cy, viewState);
  const nodes = visible.nodes().filter((node) => nodeIds.has(node.id()));
  const activeNodeIds = new Set(nodes.map((node) => node.id()));
  const edges = visible.edges().filter(
    (edge) => activeNodeIds.has(edge.source().id()) && activeNodeIds.has(edge.target().id()),
  );

  return nodes.union(edges);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function nodeMatchesSearch(node: cytoscape.NodeSingular, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) {
    return true;
  }

  const fields = [node.data("title"), node.data("id"), node.data("slug")].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return fields.some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

const SEARCH_RESULTS_LIMIT = 50;

function isConceptNode(node: cytoscape.NodeSingular): boolean {
  return String(node.data("kind")) === "concept";
}

function isYearNode(node: cytoscape.NodeSingular): boolean {
  return String(node.data("kind")) === "year";
}

function isDegreeNode(node: cytoscape.NodeSingular): boolean {
  return String(node.data("kind")) === "degree";
}

function isHierarchyNode(node: cytoscape.NodeSingular): boolean {
  return isYearNode(node) || isDegreeNode(node);
}

function shouldHideConceptNodes(
  viewState: GraphViewState,
  focusVisibleNodeIds: Set<string> | null,
): boolean {
  return (
    viewState.conceptsHidden &&
    !focusVisibleNodeIds &&
    !viewState.kindFilters.concept
  );
}

function shouldHideYearNodes(
  viewState: GraphViewState,
  focusVisibleNodeIds: Set<string> | null,
): boolean {
  return (
    viewState.yearsHidden &&
    !focusVisibleNodeIds &&
    !viewState.kindFilters.year &&
    !viewState.kindFilters.degree
  );
}

function matchingNodes(
  cy: cytoscape.Core,
  query: string,
  options: { excludeConcepts?: boolean; excludeYears?: boolean } = {},
): cytoscape.NodeSingular[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) {
    return [];
  }

  const matches: cytoscape.NodeSingular[] = [];
  cy.nodes().forEach((node) => {
    if (options.excludeConcepts && isConceptNode(node)) {
      return;
    }

    if (options.excludeYears && isHierarchyNode(node)) {
      return;
    }

    if (nodeMatchesSearch(node, query)) {
      matches.push(node);
    }
  });

  return matches.sort((left, right) =>
    nodeTitle(left, left.id()).localeCompare(nodeTitle(right, right.id()), "es-AR"),
  );
}

function kindLabel(kind: string, trayecto?: string): string {
  if (kind === "course" && isTrayectoNoEstructurado(trayecto)) {
    return "TNE";
  }

  const match = GRAPH_NODE_KINDS.find((item) => item.kind === kind);
  return match?.label ?? kind;
}

function directedPathToNodeIds(cy: cytoscape.Core, targetNodeId: string): Set<string> {
  const reachable = new Set<string>([targetNodeId]);
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = cy.getElementById(nodeId);
    if (node.empty() || !node.isNode()) {
      continue;
    }

    node.incomers("edge").forEach((edge) => {
      const sourceId = edge.source().id();
      if (reachable.has(sourceId)) {
        return;
      }

      reachable.add(sourceId);
      queue.push(sourceId);
    });
  }

  return reachable;
}

function intersectNodeIdSets(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((nodeId) => right.has(nodeId)));
}

function computeGlobalVisibleNodeIds(
  cy: cytoscape.Core,
  viewState: GraphViewState,
): Set<string> | null {
  const constraints: Set<string>[] = [];

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const nodeId = viewState.kindFilters[kind];
    if (nodeId) {
      constraints.push(directedPathToNodeIds(cy, nodeId));
    }
  }

  if (viewState.searchQuery.trim()) {
    const matchingNodeIds = new Set<string>();
    cy.nodes().forEach((node) => {
      if (nodeMatchesSearch(node, viewState.searchQuery)) {
        matchingNodeIds.add(node.id());
      }
    });
    constraints.push(matchingNodeIds);
  }

  if (constraints.length === 0) {
    return null;
  }

  return constraints.reduce((visibleNodeIds, constraint) => {
    return intersectNodeIdSets(visibleNodeIds, constraint);
  });
}

function applyElementVisibility(cy: cytoscape.Core, viewState: GraphViewState): cytoscape.Collection {
  const focusVisibleNodeIds =
    viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0
      ? visibleNodeIdsForExpansions(cy, viewState.expansionNodeIds)
      : null;
  const globalVisibleNodeIds = computeGlobalVisibleNodeIds(cy, viewState);

  cy.nodes().forEach((node) => {
    const nodeId = node.id();
    let visible = true;

    if (shouldHideConceptNodes(viewState, focusVisibleNodeIds) && isConceptNode(node)) {
      visible = false;
    }

    if (shouldHideYearNodes(viewState, focusVisibleNodeIds) && isHierarchyNode(node)) {
      visible = false;
    }

    if (globalVisibleNodeIds && !globalVisibleNodeIds.has(nodeId)) {
      visible = false;
    }

    if (focusVisibleNodeIds && !focusVisibleNodeIds.has(nodeId)) {
      visible = false;
    }

    node.toggleClass("filtered-out", !visible);
  });

  cy.edges().forEach((edge) => {
    let visible =
      !edge.source().hasClass("filtered-out") && !edge.target().hasClass("filtered-out");

    if (visible) {
      const edgeKind = String(edge.data("kind"));
      const [sourceKind, targetKind] = edgeKinds(edge);

      if (viewState.courseLinkMode === "mentions") {
        if (edgeKind === "course-prerequisite") {
          visible = false;
        }
      } else if (edgeKind === "page-ref" && sourceKind === "course" && targetKind === "course") {
        visible = false;
      } else if (edgeKind === "course-prerequisite") {
        visible = true;
      }
    }

    edge.toggleClass("filtered-out", !visible);
  });

  return cy.elements().not(".filtered-out");
}

function assignExpansionAnchorColor(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  anchorId: string,
): string {
  const existing = viewState.expansionAnchorColors.get(anchorId);
  if (existing) {
    return existing;
  }

  const anchor = cy.getElementById(anchorId);
  const { base } = nodeStyle(anchor);
  const usedColors = new Set(viewState.expansionAnchorColors.values());
  const nextColor =
    expansionShadesForBase(base).find((color) => !usedColors.has(color)) ?? base;

  viewState.expansionAnchorColors.set(anchorId, nextColor);
  return nextColor;
}

function applyExpansionEdgeColors(cy: cytoscape.Core, viewState: GraphViewState): void {
  cy.edges().removeData("expansionColor");

  const expansionNodeIds = viewState.expansionNodeIds;
  if (!expansionNodeIds || expansionNodeIds.length === 0) {
    return;
  }

  for (const anchorId of expansionNodeIds) {
    const color = viewState.expansionAnchorColors.get(anchorId);
    if (!color) {
      continue;
    }

    const anchor = cy.getElementById(anchorId);
    if (anchor.empty() || !anchor.isNode()) {
      continue;
    }

    anchor.connectedEdges().forEach((edge) => {
      if (edge.data("expansionColor")) {
        return;
      }

      edge.data("expansionColor", color);
    });
  }
}

function fitVisibleGraph(cy: cytoscape.Core, padding = 48): void {
  const visibleElements = cy.elements().not(".filtered-out");
  if (visibleElements.length > 0) {
    cy.fit(visibleElements, padding);
  }
}

function kindStyle(kind: string) {
  return kindStyleForKind(kind);
}

function nodeStyle(node: cytoscape.SingularElementArgument) {
  const kind = String(node.data("kind") ?? "");
  if (kind === "course") {
    return courseNodeStyle(String(node.data("trayecto") ?? ""));
  }

  return kindStyleForKind(kind);
}

function edgeLineColor(edge: cytoscape.EdgeSingular): string {
  return nodeStyle(edge.source()).border;
}

function nodeTitle(node: cytoscape.SingularElementArgument, fallback: string): string {
  if (!node.isNode()) {
    return fallback;
  }

  const title = node.data("title");
  if (typeof title === "string" && title.length > 0) {
    return capitalizeWords(title);
  }

  return capitalizeWords(fallback);
}

function updateExpansionListUI(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  listRoot: HTMLElement | null,
  ui: GraphUi,
): void {
  if (!listRoot) {
    return;
  }

  listRoot.replaceChildren();
  const expansionNodeIds = viewState.expansionNodeIds;
  if (!expansionNodeIds || expansionNodeIds.length === 0) {
    listRoot.hidden = true;
    return;
  }

  listRoot.hidden = false;

  const label = document.createElement("span");
  label.className = "graph__expansion-label";
  label.textContent = "Expansiones";

  const list = document.createElement("ul");
  list.className = "graph__expansion-items";

  for (const nodeId of expansionNodeIds) {
    const node = cy.getElementById(nodeId);
    const item = document.createElement("li");
    const chip = document.createElement("div");
    chip.className = "graph__expansion-chip";
    chip.style.borderColor =
      viewState.expansionAnchorColors.get(nodeId) ?? nodeStyle(node).border;
    if (nodeId === viewState.focusedNodeId) {
      chip.classList.add("graph__expansion-chip--active");
    }

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "graph__expansion-chip-main";

    const swatch = document.createElement("span");
    const style = nodeStyle(node);
    swatch.className = "graph__expansion-swatch";
    swatch.style.background = style.swatchFill;
    swatch.style.borderColor = style.border;

    const text = document.createElement("span");
    text.textContent = nodeTitle(node, nodeId);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "graph__expansion-remove";
    removeButton.setAttribute("aria-label", `Quitar ${nodeTitle(node, nodeId)}`);
    removeButton.textContent = "×";

    selectButton.append(swatch, text);
    selectButton.addEventListener("click", () => {
      if (!node.isNode()) {
        return;
      }

      viewState.focusedNodeId = nodeId;
      cy.nodes().removeClass("focused");
      node.addClass("focused");
      ui.syncView();
    });

    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeExpansionNode(cy, nodeId, viewState, ui);
    });

    chip.append(selectButton, removeButton);
    item.appendChild(chip);
    list.appendChild(item);
  }

  listRoot.append(label, list);
}

function buildKindFilterOptions(cy: cytoscape.Core): Record<KindFilterKey, cytoscape.NodeSingular[]> {
  const options: Record<KindFilterKey, cytoscape.NodeSingular[]> = {
    degree: [],
    year: [],
    course: [],
    concept: [],
  };

  cy.nodes().forEach((node) => {
    const kind = String(node.data("kind"));
    if (kind in options) {
      options[kind as KindFilterKey].push(node);
    }
  });

  for (const kind of Object.keys(options) as KindFilterKey[]) {
    options[kind].sort((left, right) =>
      nodeTitle(left, left.id()).localeCompare(nodeTitle(right, right.id()), "es-AR"),
    );
  }

  return options;
}

function mountKindFilters(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  filtersRoot: HTMLElement,
): void {
  const optionsByKind = buildKindFilterOptions(cy);

  for (const { kind, label } of GRAPH_FILTER_KINDS) {
    const field = document.createElement("div");
    field.className = "graph__filter";

    const fieldLabel = document.createElement("label");
    fieldLabel.className = "graph__filter-label";
    fieldLabel.textContent = label;
    fieldLabel.setAttribute("for", `graph-filter-${kind}`);

    const select = document.createElement("select");
    select.className = "graph__filter-select";
    select.id = `graph-filter-${kind}`;
    const defaultOption = document.createElement("option");
    defaultOption.className = "graph__filter-option";
    defaultOption.value = "";
    defaultOption.textContent = "Todos";
    select.appendChild(defaultOption);

    for (const node of optionsByKind[kind]) {
      const option = document.createElement("option");
      option.className = "graph__filter-option";
      option.value = node.id();
      option.textContent = nodeTitle(node, node.id());
      select.appendChild(option);
    }

    select.value = viewState.kindFilters[kind];

    select.addEventListener("change", () => {
      viewState.kindFilters[kind] = select.value;
      ui.syncView();
      refreshGraphLayout(cy, viewState);
    });

    field.append(fieldLabel, select);
    filtersRoot.appendChild(field);
  }
}

function resetKindFilters(
  filtersRoot: HTMLElement,
  viewState: GraphViewState,
): void {
  viewState.kindFilters = createKindFilters();

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const select = filtersRoot.querySelector<HTMLSelectElement>(`#graph-filter-${kind}`);
    if (select) {
      select.value = "";
    }
  }
}

function syncKindFilterControls(
  filtersRoot: HTMLElement | null,
  viewState: GraphViewState,
): void {
  if (!filtersRoot) {
    return;
  }

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const select = filtersRoot.querySelector<HTMLSelectElement>(`#graph-filter-${kind}`);
    if (select) {
      select.value = viewState.kindFilters[kind];
    }
  }
}

function restoreGraphViewFromUrl(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  filtersRoot: HTMLElement | null,
  toggleConceptsButton: HTMLButtonElement | null,
  toggleYearsButton: HTMLButtonElement | null,
): boolean {
  const hadExpansion = isExpansionActive(viewState);
  const urlRestorePending = applyUrlStateToViewState(cy, viewState, parseGraphUrlState());

  syncKindFilterControls(filtersRoot, viewState);
  if (toggleConceptsButton) {
    syncToggleConceptsButton(toggleConceptsButton, viewState.conceptsHidden);
  }
  if (toggleYearsButton) {
    syncToggleYearsButton(toggleYearsButton, viewState.yearsHidden);
  }

  if (isExpansionActive(viewState)) {
    if (viewState.fullGraphPositions) {
      applyRestoredUrlView(cy, viewState, ui);
    }
    return urlRestorePending;
  }

  if (hadExpansion) {
    viewState.expansionAnchorColors.clear();
    viewState.focusedNodeId = null;
    cy.elements().removeClass("focused");
    if (viewState.fullGraphPositions) {
      restorePositions(cy, viewState.fullGraphPositions);
    }
  }

  ui.syncView(true);
  if (viewState.initialLayoutSaved) {
    refreshGraphLayout(cy, viewState);
  }

  return urlRestorePending;
}

function mountResetFiltersButton(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  filtersRoot: HTMLElement,
  resetButton: HTMLButtonElement,
): void {
  resetButton.addEventListener("click", () => {
    resetKindFilters(filtersRoot, viewState);
    ui.syncView();
    refreshGraphLayout(cy, viewState);
  });
}

function isExpansionActive(viewState: GraphViewState): boolean {
  return Boolean(viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0);
}

function setConceptsHidden(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  hidden: boolean,
): void {
  viewState.conceptsHidden = hidden;
  ui.syncView();

  if (!isExpansionActive(viewState)) {
    refreshGraphLayout(cy, viewState);
  }
}

function syncToggleConceptsButton(button: HTMLButtonElement, hidden: boolean): void {
  button.setAttribute("aria-pressed", hidden ? "true" : "false");
  button.textContent = hidden ? "Mostrar conceptos" : "Ocultar conceptos";
  button.title = hidden
    ? "Volver a mostrar los nodos de concepto"
    : "Ocultar conceptos en la vista general; al hacer clic en un nodo siguen visibles";
}

function mountToggleConceptsButton(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  button: HTMLButtonElement,
): void {
  syncToggleConceptsButton(button, viewState.conceptsHidden);

  button.addEventListener("click", () => {
    setConceptsHidden(cy, viewState, ui, !viewState.conceptsHidden);
    syncToggleConceptsButton(button, viewState.conceptsHidden);
  });
}

function setYearsHidden(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  hidden: boolean,
): void {
  viewState.yearsHidden = hidden;
  ui.syncView();

  if (!isExpansionActive(viewState)) {
    refreshGraphLayout(cy, viewState);
  }
}

function syncToggleYearsButton(button: HTMLButtonElement, hidden: boolean): void {
  button.setAttribute("aria-pressed", hidden ? "true" : "false");
  button.textContent = hidden ? "Mostrar carrera y años" : "Ocultar carrera y años";
  button.title = hidden
    ? "Volver a mostrar los nodos de carrera y año"
    : "Ocultar nodos de carrera y año en la vista general; al hacer clic en un nodo siguen visibles";
}

function mountToggleYearsButton(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  button: HTMLButtonElement,
): void {
  syncToggleYearsButton(button, viewState.yearsHidden);

  button.addEventListener("click", () => {
    setYearsHidden(cy, viewState, ui, !viewState.yearsHidden);
    syncToggleYearsButton(button, viewState.yearsHidden);
  });
}

function syncToggleCourseLinksButton(button: HTMLButtonElement, mode: CourseLinkMode): void {
  const correlativasActive = mode === "correlativas";
  button.setAttribute("aria-pressed", correlativasActive ? "true" : "false");
  button.textContent = correlativasActive ? "Mostrar Menciones" : "Mostrar Correlativas";
  button.title = correlativasActive
    ? "Mostrar enlaces de mención entre materias (wikilinks)"
    : "Mostrar correlativas declaradas en el frontmatter de cada materia";
}

function setCourseLinkMode(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  mode: CourseLinkMode,
): void {
  viewState.courseLinkMode = mode;
  ui.syncView(true);

  if (!isExpansionActive(viewState)) {
    refreshGraphLayout(cy, viewState);
  }
}

function mountToggleCourseLinksButton(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  button: HTMLButtonElement,
): void {
  syncToggleCourseLinksButton(button, viewState.courseLinkMode);

  button.addEventListener("click", () => {
    const nextMode =
      viewState.courseLinkMode === "correlativas" ? "mentions" : "correlativas";
    setCourseLinkMode(cy, viewState, ui, nextMode);
    syncToggleCourseLinksButton(button, viewState.courseLinkMode);
  });
}

function positionSearchDropdown(
  searchInput: HTMLInputElement,
  resultsRoot: HTMLElement,
): void {
  const rect = searchInput.getBoundingClientRect();
  resultsRoot.style.top = `${rect.bottom + 4}px`;
  resultsRoot.style.left = `${rect.left}px`;
  resultsRoot.style.width = `${rect.width}px`;
}

function setSearchDropdownOpen(
  searchInput: HTMLInputElement,
  resultsRoot: HTMLElement,
  open: boolean,
): void {
  resultsRoot.classList.toggle("graph__search-dropdown--open", open);
  searchInput.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    positionSearchDropdown(searchInput, resultsRoot);
  }
}

function updateSearchResultsUI(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  searchInput: HTMLInputElement,
  resultsRoot: HTMLElement,
  onNodeActivate: (node: cytoscape.NodeSingular) => void,
): void {
  const query = searchInput.value;
  const matches = matchingNodes(cy, query, {
    excludeConcepts: shouldHideConceptNodes(viewState, null),
    excludeYears: shouldHideYearNodes(viewState, null),
  });
  resultsRoot.replaceChildren();

  if (!query.trim()) {
    setSearchDropdownOpen(searchInput, resultsRoot, false);
    return;
  }

  if (matches.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "graph__search-empty";
    emptyItem.textContent = "Sin coincidencias";
    resultsRoot.appendChild(emptyItem);
    setSearchDropdownOpen(searchInput, resultsRoot, true);
    return;
  }

  const visibleMatches = matches.slice(0, SEARCH_RESULTS_LIMIT);
  for (const node of visibleMatches) {
    const item = document.createElement("div");
    item.className = "graph__search-result";
    item.setAttribute("role", "option");

    const swatch = document.createElement("span");
    const style = nodeStyle(node);
    swatch.className = "graph__search-result-swatch";
    swatch.style.background = style.swatchFill;
    swatch.style.borderColor = style.border;

    const label = document.createElement("span");
    label.className = "graph__search-result-label";
    label.textContent = nodeTitle(node, node.id());

    const meta = document.createElement("span");
    meta.className = "graph__search-result-kind";
    meta.textContent = kindLabel(String(node.data("kind")), String(node.data("trayecto") ?? ""));

    item.append(swatch, label, meta);
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    item.addEventListener("click", () => {
      viewState.searchQuery = "";
      searchInput.value = "";
      setSearchDropdownOpen(searchInput, resultsRoot, false);
      ui.syncView();
      onNodeActivate(node);
    });

    resultsRoot.appendChild(item);
  }

  if (matches.length > SEARCH_RESULTS_LIMIT) {
    const moreItem = document.createElement("div");
    moreItem.className = "graph__search-more";
    moreItem.textContent = `Mostrando ${SEARCH_RESULTS_LIMIT} de ${matches.length} nodos`;
    resultsRoot.appendChild(moreItem);
  }

  setSearchDropdownOpen(searchInput, resultsRoot, true);
}

function mountSearchInput(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  searchInput: HTMLInputElement,
  resultsRoot: HTMLElement | null,
  onNodeActivate: (node: cytoscape.NodeSingular) => void,
): void {
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  const applySearch = () => {
    viewState.searchQuery = searchInput.value;
    ui.syncView(true);
    if (resultsRoot) {
      updateSearchResultsUI(cy, viewState, ui, searchInput, resultsRoot, onNodeActivate);
    }
  };

  searchInput.addEventListener("input", () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
      applySearch();
      searchTimeout = undefined;
    }, 150);
  });

  searchInput.addEventListener("focus", () => {
    if (resultsRoot && searchInput.value.trim()) {
      updateSearchResultsUI(cy, viewState, ui, searchInput, resultsRoot, onNodeActivate);
    }
  });

  searchInput.addEventListener("blur", () => {
    if (!resultsRoot) {
      return;
    }

    window.setTimeout(() => {
      setSearchDropdownOpen(searchInput, resultsRoot, false);
    }, 150);
  });

  const repositionDropdown = () => {
    if (resultsRoot?.classList.contains("graph__search-dropdown--open")) {
      positionSearchDropdown(searchInput, resultsRoot);
    }
  };

  window.addEventListener("resize", repositionDropdown);
  window.addEventListener(
    "scroll",
    repositionDropdown,
    true,
  );
}

function edgeKinds(edge: cytoscape.EdgeSingular): [string, string] {
  return [String(edge.source().data("kind")), String(edge.target().data("kind"))];
}

function edgeIdealLength(edge: cytoscape.EdgeSingular): number {
  if (edge.data("kind") === "concept-tag") {
    return 35;
  }

  if (edge.data("kind") === "course-prerequisite") {
    return 62;
  }

  const [sourceKind, targetKind] = edgeKinds(edge);
  const kinds = new Set([sourceKind, targetKind]);

  if (kinds.has("concept")) {
    return 48;
  }

  if (sourceKind === "course" && targetKind === "course") {
    return 55;
  }

  if (kinds.has("year") && kinds.has("course")) {
    return 88;
  }

  if (kinds.has("degree") && kinds.has("year")) {
    return 72;
  }

  if (kinds.has("degree") && kinds.has("course")) {
    return 96;
  }

  return 80;
}

function edgeLayoutElasticity(edge: cytoscape.EdgeSingular): number {
  if (edge.data("kind") === "concept-tag") {
    return 0.85;
  }

  if (edge.data("kind") === "course-prerequisite") {
    return 0.68;
  }

  const [sourceKind, targetKind] = edgeKinds(edge);

  if (sourceKind === "course" && targetKind === "course") {
    return 0.72;
  }

  if (
    (sourceKind === "year" && targetKind === "course") ||
    (sourceKind === "course" && targetKind === "year")
  ) {
    return 0.42;
  }

  return 0.55;
}

function runGraphLayout(
  eles: cytoscape.Collection,
  options: { quality: "default" | "proof"; randomize: boolean },
): void {
  eles.layout({
    ...graphLayoutOptions(),
    quality: options.quality,
    randomize: options.randomize,
    eles,
    fit: true,
    padding: 48,
  } as cytoscape.LayoutOptions).run();
}

function refreshGraphLayout(
  cy: cytoscape.Core,
  viewState: GraphViewState,
): void {
  const visibleElements = visibleLayoutElements(cy, viewState);
  if (visibleElements.length === 0) {
    return;
  }

  persistCurrentPositions(cy, viewState);

  const inFocus = Boolean(viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0);
  if (inFocus && viewState.expansionNodeIds) {
    viewState.focusLayoutCache.delete(expansionSessionKey(viewState.expansionNodeIds));
  }

  runGraphLayout(visibleElements, {
    quality: inFocus ? "default" : "proof",
    randomize: true,
  });
}

function mountRefreshButton(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  refreshButton: HTMLButtonElement,
): void {
  refreshButton.addEventListener("click", () => {
    refreshGraphLayout(cy, viewState);
  });
}

function removeExpansionNode(
  cy: cytoscape.Core,
  nodeId: string,
  viewState: GraphViewState,
  ui: GraphUi,
): void {
  if (!viewState.expansionNodeIds?.includes(nodeId)) {
    return;
  }

  persistCurrentPositions(cy, viewState);
  viewState.expansionNodeIds = viewState.expansionNodeIds.filter((id) => id !== nodeId);
  viewState.expansionAnchorColors.delete(nodeId);

  if (viewState.focusedNodeId === nodeId) {
    viewState.focusedNodeId = null;
    cy.nodes().removeClass("focused");
  }

  if (viewState.expansionNodeIds.length === 0) {
    clearNeighborhoodFilter(cy, viewState, ui);
    return;
  }

  applyFocusView(cy, viewState, ui, { randomize: false });
}

function applyFocusView(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
  options: { randomize: boolean; focusNode?: cytoscape.NodeSingular },
): void {
  const expansionNodeIds = viewState.expansionNodeIds;
  if (!expansionNodeIds || expansionNodeIds.length === 0) {
    clearNeighborhoodFilter(cy, viewState, ui);
    return;
  }

  const visibleNodeIds = visibleNodeIdsForExpansions(cy, expansionNodeIds);
  const focusEles = visibleLayoutSubgraph(cy, viewState, visibleNodeIds);
  const sessionKey = expansionSessionKey(expansionNodeIds);

  cy.elements().removeClass("focused");

  if (options.focusNode) {
    options.focusNode.addClass("focused");
    viewState.focusedNodeId = options.focusNode.id();
  }

  ui.syncView();

  const cached = viewState.focusLayoutCache.get(sessionKey);
  if (cached) {
    restorePositions(cy, cached);
    fitVisibleGraph(cy);
    return;
  }

  runGraphLayout(focusEles, {
    quality: "default",
    randomize: options.randomize,
  });
}

function focusOrExpandNeighborhood(
  cy: cytoscape.Core,
  node: cytoscape.NodeSingular,
  viewState: GraphViewState,
  ui: GraphUi,
): void {
  const nodeId = node.id();
  const inFocus = viewState.expansionNodeIds !== null;

  if (inFocus) {
    persistCurrentPositions(cy, viewState);
  }

  const previousVisibleNodeIds = inFocus
    ? visibleNodeIdsForExpansions(cy, viewState.expansionNodeIds!)
    : null;

  if (inFocus && viewState.expansionNodeIds!.includes(nodeId)) {
    viewState.focusedNodeId = nodeId;
    cy.nodes().removeClass("focused");
    node.addClass("focused");
    ui.syncView(true);
    return;
  }

  const expansionNodeIds = inFocus ? [...viewState.expansionNodeIds!, nodeId] : [nodeId];
  if (!viewState.expansionNodeIds?.includes(nodeId)) {
    assignExpansionAnchorColor(cy, viewState, nodeId);
  }
  viewState.expansionNodeIds = expansionNodeIds;

  const visibleNodeIds = visibleNodeIdsForExpansions(cy, expansionNodeIds);
  const addedNodeCount = previousVisibleNodeIds
    ? [...visibleNodeIds].filter((id) => !previousVisibleNodeIds.has(id)).length
    : visibleNodeIds.size;

  if (addedNodeCount === 0) {
    viewState.focusedNodeId = nodeId;
    cy.nodes().removeClass("focused");
    node.addClass("focused");
    ui.syncView(true);
    return;
  }

  applyFocusView(cy, viewState, ui, {
    randomize: !inFocus,
    focusNode: node,
  });
}

function clearNeighborhoodFilter(
  cy: cytoscape.Core,
  viewState: GraphViewState,
  ui: GraphUi,
): void {
  if (viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0) {
    persistCurrentPositions(cy, viewState);
  }

  viewState.expansionNodeIds = null;
  viewState.expansionAnchorColors.clear();
  viewState.focusedNodeId = null;
  cy.elements().removeClass("focused");

  if (viewState.fullGraphPositions) {
    restorePositions(cy, viewState.fullGraphPositions);
  }

  ui.syncView(true);
}

function compareNodes(left: string, right: string): number {
  return left.localeCompare(right, "es-AR");
}


function canonicalizeLoadedEdgeDirection(
  source: string,
  target: string,
  kind: string,
  kindById: Map<string, string>,
): [string, string] {
  if (kind !== "page-ref") {
    return [source, target];
  }

  const sourceRank = structuralPageKindRank(kindById.get(source));
  const targetRank = structuralPageKindRank(kindById.get(target));
  if (
    sourceRank !== undefined &&
    targetRank !== undefined &&
    sourceRank > targetRank
  ) {
    return [target, source];
  }

  return [source, target];
}

function unifyBidirectionalEdges(
  edges: NonNullable<cytoscape.ElementsDefinition["edges"]>,
  kindById: Map<string, string>,
): NonNullable<cytoscape.ElementsDefinition["edges"]> {
  const unified = new Map<string, (typeof edges)[number]>();

  for (const edge of edges) {
    const kind = edge.data.kind;
    const [source, target] = canonicalizeLoadedEdgeDirection(
      edge.data.source,
      edge.data.target,
      kind,
      kindById,
    );
    const pairKey = `${[source, target].sort(compareNodes).join("::")}::${kind}`;

    if (unified.has(pairKey)) {
      continue;
    }

    unified.set(pairKey, {
      ...edge,
      data: {
        ...edge.data,
        id: `${source}::${target}::${kind}`,
        source,
        target,
      },
    });
  }

  return [...unified.values()];
}

function graphLayoutOptions(): cytoscape.LayoutOptions {
  return {
    name: "fcose",
    quality: "proof",
    randomize: true,
    animate: false,
    fit: true,
    padding: 48,
    nodeDimensionsIncludeLabels: true,
    packComponents: true,
    nodeSeparation: 72,
    idealEdgeLength: edgeIdealLength,
    edgeElasticity: edgeLayoutElasticity,
    nestingFactor: 0.1,
    gravity: 0.24,
    numIter: 2500,
    tile: true,
    tilingPaddingVertical: 12,
    tilingPaddingHorizontal: 12,
  } as cytoscape.LayoutOptions;
}

function prepareGraphElements(elements: cytoscape.ElementsDefinition): cytoscape.ElementsDefinition {
  const kindById = new Map<string, string>();
  for (const node of elements.nodes ?? []) {
    if (typeof node.data.id === "string" && typeof node.data.kind === "string") {
      kindById.set(node.data.id, node.data.kind);
    }
  }

  return {
    nodes: elements.nodes?.map((node) => {
      const label = node.data.label;
      const rawTitle = typeof label === "string" ? label : String(label ?? node.data.id ?? "");
      const existingClasses =
        typeof node.classes === "string"
          ? node.classes.split(/\s+/).filter(Boolean)
          : Array.isArray(node.classes)
            ? node.classes.filter((entry): entry is string => typeof entry === "string")
            : [];
      const classes = [
        ...existingClasses,
        ...(String(node.data.kind) === "course" && isTrayectoNoEstructurado(node.data.trayecto)
          ? ["tne"]
          : []),
      ];

      return {
        ...node,
        classes: [...new Set(classes)].join(" "),
        data: {
          ...node.data,
          title: capitalizeWords(rawTitle),
          label: typeof label === "string" ? formatGraphNodeLabel(label) : label,
        },
      };
    }),
    edges: elements.edges
      ? unifyBidirectionalEdges(elements.edges, kindById).map((edge) => {
          const sourceKind = kindById.get(String(edge.data.source));
          const targetKind = kindById.get(String(edge.data.target));
          const kind = String(edge.data.kind);
          const isCourseInterlink =
            kind === "course-prerequisite" ||
            (kind === "page-ref" && sourceKind === "course" && targetKind === "course");

          if (!isCourseInterlink) {
            return edge;
          }

          const existingClasses =
            typeof edge.classes === "string"
              ? edge.classes.split(/\s+/).filter(Boolean)
              : Array.isArray(edge.classes)
                ? edge.classes.filter((entry): entry is string => typeof entry === "string")
                : [];

          return {
            ...edge,
            classes: [...new Set([...existingClasses, "course-interlink"])].join(" "),
          };
        })
      : elements.edges,
  };
}

function openConceptPanelForNode(
  node: cytoscape.NodeSingular,
  conceptPagesBySlug: Map<string, ConceptPage>,
  conceptPanel: ReturnType<typeof mountConceptPanel> | null,
): void {
  if (!conceptPanel || String(node.data("kind")) !== "concept") {
    return;
  }

  const slug = node.data("slug");
  if (typeof slug !== "string" || !slug) {
    return;
  }

  const page = conceptPagesBySlug.get(slug);
  if (!page) {
    return;
  }

  conceptPanel.open(page);
}

async function resolveAllowCmsNavigation(): Promise<boolean> {
  if (isAuthDisabled()) {
    return true;
  }

  const config = readSupabaseConfig();
  if (isMissingConfig(config)) {
    return false;
  }

  return fetchIsAppAdmin(createBrowserClient(config));
}

export async function mountGraph(containerClass: string, options: MountGraphOptions = {}): Promise<void> {
  const container = document.querySelector<HTMLElement>(`.${containerClass}`);
  if (!container) {
    throw new Error(`Missing graph container .${containerClass}`);
  }

  const allowCmsNavigation = await resolveAllowCmsNavigation();

  const [graphLoaded, conceptPagesBySlug] = await Promise.all([
    loadAnalyticsArtifact("graph.cy.json"),
    options.conceptPanelId
      ? loadConceptPages().catch((error) => {
          console.error(error);
          return new Map<string, ConceptPage>();
        })
      : Promise.resolve(new Map<string, ConceptPage>()),
  ]);

  const payload =
    typeof graphLoaded === "string"
      ? parseGeneratedPayload<{ elements: cytoscape.ElementsDefinition }>(graphLoaded)
      : (graphLoaded as { elements: cytoscape.ElementsDefinition });
  const defaultNodeStyle = kindStyleForKind("");

  const cy = cytoscape({
    container,
    elements: prepareGraphElements(payload.elements),
    layout: { name: "null" },
    autoungrabify: false,
    boxSelectionEnabled: false,
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 7,
          "font-family": "Montserrat, sans-serif",
          "font-weight": 700,
          "text-wrap": "wrap",
          "text-max-width": 42,
          width: 58,
          height: 58,
          "background-opacity": 0,
          "border-width": 3,
          "border-color": defaultNodeStyle.border,
          color: AUSTRAL.text,
        },
      },
      {
        selector: "node[kind = 'degree']",
        style: {
          "border-color": kindStyle("degree").border,
        },
      },
      {
        selector: "node[kind = 'year']",
        style: {
          "border-color": kindStyle("year").border,
        },
      },
      {
        selector: "node[kind = 'course']",
        style: {
          "border-color": kindStyle("course").border,
          width: 76,
          height: 76,
          "font-size": 8,
          "text-max-width": 58,
        },
      },
      {
        selector: "node.tne",
        style: {
          "border-color": AUSTRAL_GRAPH_TNE.border,
        },
      },
      {
        selector: "node[kind = 'concept']",
        style: {
          "border-color": kindStyle("concept").border,
          width: 48,
          height: 48,
          "font-size": 6,
          "text-max-width": 34,
          "font-family": "Montserrat, sans-serif",
          "font-weight": 700,
        },
      },
      {
        selector: "node.focused",
        style: {
          "border-width": 4.5,
        },
      },
      {
        selector: ".filtered-out",
        style: {
          display: "none",
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": (edge) => edgeLineColor(edge),
          "target-arrow-color": (edge) => edgeLineColor(edge),
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
        },
      },
      {
        selector: "edge[expansionColor]",
        style: {
          width: 2.25,
          "line-color": "data(expansionColor)",
          "target-arrow-color": "data(expansionColor)",
        },
      },
      {
        selector: "edge.course-interlink",
        style: {
          width: 2,
        },
      },
    ],
  });

  container.style.cursor = "grab";
  cy.on("mousedown", () => {
    container.style.cursor = "grabbing";
  });
  cy.on("mouseup mouseleave", () => {
    container.style.cursor = "grab";
  });

  const cmsBase = options.cmsBase ?? defaultCmsBase();
  const expansionListRoot = options.expansionListId
    ? document.getElementById(options.expansionListId)
    : null;
  const filtersRoot = options.filtersRootId
    ? document.getElementById(options.filtersRootId)
    : null;
  const searchInput = options.searchInputId
    ? document.getElementById(options.searchInputId)
    : null;
  const searchResultsRoot = options.searchResultsId
    ? document.getElementById(options.searchResultsId)
    : null;
  const refreshButton = options.refreshButtonId
    ? document.getElementById(options.refreshButtonId)
    : null;
  const conceptPanelRoot = options.conceptPanelId
    ? document.getElementById(options.conceptPanelId)
    : null;
  const conceptPanel = conceptPanelRoot ? mountConceptPanel(conceptPanelRoot) : null;

  const viewState: GraphViewState = {
    fullGraphPositions: null,
    initialLayoutSaved: false,
    expansionNodeIds: null,
    expansionAnchorColors: new Map(),
    focusedNodeId: null,
    focusLayoutCache: new Map(),
    kindFilters: createKindFilters(),
    searchQuery: "",
    conceptsHidden: DEFAULT_GRAPH_CONCEPTS_HIDDEN,
    yearsHidden: DEFAULT_GRAPH_YEARS_HIDDEN,
    courseLinkMode: DEFAULT_GRAPH_COURSE_LINK_MODE,
  };
  let urlRestorePending = applyUrlStateToViewState(cy, viewState, parseGraphUrlState());

  const ui: GraphUi = {
    expansionListRoot,
    syncView: (fit = false) => {
      applyElementVisibility(cy, viewState);
      applyExpansionEdgeColors(cy, viewState);
      updateExpansionListUI(cy, viewState, expansionListRoot, ui);
      writeGraphUrlState(urlStateFromViewState(cy, viewState));
      cy.resize();
      if (fit) {
        fitVisibleGraph(cy);
      }
    },
  };

  cy.on("layoutstop", () => {
    if (!viewState.initialLayoutSaved) {
      viewState.fullGraphPositions = snapshotPositions(cy);
      viewState.initialLayoutSaved = true;
      if (urlRestorePending && isExpansionActive(viewState)) {
        applyRestoredUrlView(cy, viewState, ui);
      }
      return;
    }

    if (viewState.expansionNodeIds && viewState.expansionNodeIds.length > 0) {
      viewState.focusLayoutCache.set(
        expansionSessionKey(viewState.expansionNodeIds),
        snapshotPositions(cy),
      );
    } else {
      viewState.fullGraphPositions = snapshotPositions(cy);
    }

    ui.syncView();
  });

  const resetFiltersButton = options.resetFiltersButtonId
    ? document.getElementById(options.resetFiltersButtonId)
    : null;

  if (filtersRoot) {
    mountKindFilters(cy, viewState, ui, filtersRoot);
  }

  if (filtersRoot && resetFiltersButton instanceof HTMLButtonElement) {
    mountResetFiltersButton(cy, viewState, ui, filtersRoot, resetFiltersButton);
  }

  const toggleConceptsButton = options.toggleConceptsButtonId
    ? document.getElementById(options.toggleConceptsButtonId)
    : null;

  if (toggleConceptsButton instanceof HTMLButtonElement) {
    mountToggleConceptsButton(cy, viewState, ui, toggleConceptsButton);
    syncToggleConceptsButton(toggleConceptsButton, viewState.conceptsHidden);
  }

  const toggleYearsButton = options.toggleYearsButtonId
    ? document.getElementById(options.toggleYearsButtonId)
    : null;

  if (toggleYearsButton instanceof HTMLButtonElement) {
    mountToggleYearsButton(cy, viewState, ui, toggleYearsButton);
    syncToggleYearsButton(toggleYearsButton, viewState.yearsHidden);
  }

  const toggleCourseLinksButton = options.toggleCourseLinksButtonId
    ? document.getElementById(options.toggleCourseLinksButtonId)
    : null;

  if (toggleCourseLinksButton instanceof HTMLButtonElement) {
    mountToggleCourseLinksButton(cy, viewState, ui, toggleCourseLinksButton);
  }

  if (urlRestorePending && !isExpansionActive(viewState)) {
    ui.syncView();
  }

  const activateNode = (node: cytoscape.NodeSingular) => {
    focusOrExpandNeighborhood(cy, node, viewState, ui);
    openConceptPanelForNode(node, conceptPagesBySlug, conceptPanel);
  };

  if (searchInput instanceof HTMLInputElement) {
    mountSearchInput(cy, viewState, ui, searchInput, searchResultsRoot, activateNode);
  }

  if (refreshButton instanceof HTMLButtonElement) {
    mountRefreshButton(cy, viewState, refreshButton);
  }

  let tapTimeout: ReturnType<typeof setTimeout> | undefined;
  let nodeDragged = false;
  let elasticDrag: ElasticNeighborDragState | null = null;

  window.addEventListener("popstate", () => {
    urlRestorePending = restoreGraphViewFromUrl(
      cy,
      viewState,
      ui,
      filtersRoot,
      toggleConceptsButton instanceof HTMLButtonElement ? toggleConceptsButton : null,
      toggleYearsButton instanceof HTMLButtonElement ? toggleYearsButton : null,
    );
  });

  cy.on("grab", "node", (event) => {
    nodeDragged = false;
    elasticDrag = captureElasticDragState(event.target);
  });

  cy.on("drag", "node", (event) => {
    nodeDragged = true;
    if (!elasticDrag || event.target.id() !== elasticDrag.grabbedNodeId) {
      return;
    }

    applyElasticNeighborDrag(cy, event.target, elasticDrag);
  });

  cy.on("dragfree", "node", () => {
    elasticDrag = null;
    persistCurrentPositions(cy, viewState);
  });

  cy.on("tap", (event) => {
    if (event.target === cy) {
      clearNeighborhoodFilter(cy, viewState, ui);
    }
  });

  cy.on("tap", "node", (event) => {
    if (nodeDragged) {
      nodeDragged = false;
      return;
    }

    const node = event.target;
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }
    tapTimeout = setTimeout(() => {
      activateNode(node);
      tapTimeout = undefined;
    }, 250);
  });

  cy.on("dbltap", "node", (event) => {
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = undefined;
    }

    const slug = event.target.data("slug");
    if (typeof slug !== "string" || !slug) {
      return;
    }
    if (!allowCmsNavigation) {
      return;
    }
    openInCms(cmsBase, slug);
  });

  runGraphLayout(visibleLayoutElements(cy, viewState), {
    quality: "proof",
    randomize: true,
  });
}
