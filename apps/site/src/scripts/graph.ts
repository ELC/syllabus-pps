import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

import {
  type ConceptPage,
  loadConceptPages,
  mountConceptPanel,
} from "./graph-concept-panel";
import {
  capitalizeWords,
  EXPANSION_EDGE_COLORS,
  formatGraphNodeLabel,
  GRAPH_FILTER_KINDS,
  GRAPH_NODE_KINDS,
} from "./graph-styles";

export { EXPANSION_EDGE_COLORS, GRAPH_FILTER_KINDS, GRAPH_NODE_KINDS };

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
  conceptPanelId?: string;
  conceptNotesUrl?: string;
}

type KindFilterKey = (typeof GRAPH_FILTER_KINDS)[number]["kind"];

type KindFilters = Record<KindFilterKey, string>;

interface GraphUi {
  expansionListRoot: HTMLElement | null;
  syncView: (fit?: boolean) => void;
}

function defaultCmsBase(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}${base.endsWith("/") ? "" : "/"}cms/`;
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
}

function createKindFilters(): KindFilters {
  return {
    career: "",
    year: "",
    course: "",
    concept: "",
  };
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

function buildInducedSubgraph(
  cy: cytoscape.Core,
  nodeIds: Set<string>,
): cytoscape.Collection {
  const nodes = cy.nodes().filter((node) => nodeIds.has(node.id()));
  const edges = cy.edges().filter((edge) => {
    return nodeIds.has(edge.source().id()) && nodeIds.has(edge.target().id());
  });

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

function matchingNodes(cy: cytoscape.Core, query: string): cytoscape.NodeSingular[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) {
    return [];
  }

  const matches: cytoscape.NodeSingular[] = [];
  cy.nodes().forEach((node) => {
    if (nodeMatchesSearch(node, query)) {
      matches.push(node);
    }
  });

  return matches.sort((left, right) =>
    nodeTitle(left, left.id()).localeCompare(nodeTitle(right, right.id()), "es-AR"),
  );
}

function kindLabel(kind: string): string {
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

    if (globalVisibleNodeIds && !globalVisibleNodeIds.has(nodeId)) {
      visible = false;
    }

    if (focusVisibleNodeIds && !focusVisibleNodeIds.has(nodeId)) {
      visible = false;
    }

    node.toggleClass("filtered-out", !visible);
  });

  cy.edges().forEach((edge) => {
    const visible =
      !edge.source().hasClass("filtered-out") && !edge.target().hasClass("filtered-out");
    edge.toggleClass("filtered-out", !visible);
  });

  return cy.elements().not(".filtered-out");
}

function expansionEdgeColor(index: number): string {
  return EXPANSION_EDGE_COLORS[index % EXPANSION_EDGE_COLORS.length];
}

function assignExpansionAnchorColor(viewState: GraphViewState, anchorId: string): string {
  const existing = viewState.expansionAnchorColors.get(anchorId);
  if (existing) {
    return existing;
  }

  const usedColors = new Set(viewState.expansionAnchorColors.values());
  const nextColor =
    EXPANSION_EDGE_COLORS.find((color) => !usedColors.has(color)) ??
    expansionEdgeColor(viewState.expansionAnchorColors.size);

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

function kindStyle(kind: string): { fill: string; border: string } {
  const match = GRAPH_NODE_KINDS.find((item) => item.kind === kind);
  return match ?? { fill: "#e2e8f0", border: "#64748b" };
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
  label.className = "graph-expansion-label";
  label.textContent = "Expansiones";

  const list = document.createElement("ul");
  list.className = "graph-expansion-items";

  for (const nodeId of expansionNodeIds) {
    const node = cy.getElementById(nodeId);
    const item = document.createElement("li");
    const chip = document.createElement("div");
    chip.className = "graph-expansion-chip";
    chip.style.borderColor =
      viewState.expansionAnchorColors.get(nodeId) ?? expansionEdgeColor(0);
    if (nodeId === viewState.focusedNodeId) {
      chip.classList.add("active");
    }

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "graph-expansion-chip-main";

    const swatch = document.createElement("span");
    const style = kindStyle(String(node.data("kind")));
    swatch.className = "graph-expansion-swatch";
    swatch.style.background = style.fill;
    swatch.style.borderColor = style.border;

    const text = document.createElement("span");
    text.textContent = nodeTitle(node, nodeId);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "graph-expansion-remove";
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
    career: [],
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
    field.className = "filter-field";

    const fieldLabel = document.createElement("label");
    fieldLabel.textContent = label;
    fieldLabel.setAttribute("for", `graph-filter-${kind}`);

    const select = document.createElement("select");
    select.id = `graph-filter-${kind}`;
    select.value = viewState.kindFilters[kind];

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Todos";
    select.appendChild(defaultOption);

    for (const node of optionsByKind[kind]) {
      const option = document.createElement("option");
      option.value = node.id();
      option.textContent = nodeTitle(node, node.id());
      select.appendChild(option);
    }

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
  resultsRoot.classList.toggle("is-open", open);
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
  const matches = matchingNodes(cy, query);
  resultsRoot.replaceChildren();

  if (!query.trim()) {
    setSearchDropdownOpen(searchInput, resultsRoot, false);
    return;
  }

  if (matches.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "graph-search-empty";
    emptyItem.textContent = "Sin coincidencias";
    resultsRoot.appendChild(emptyItem);
    setSearchDropdownOpen(searchInput, resultsRoot, true);
    return;
  }

  const visibleMatches = matches.slice(0, SEARCH_RESULTS_LIMIT);
  for (const node of visibleMatches) {
    const item = document.createElement("div");
    item.className = "graph-search-result";
    item.setAttribute("role", "option");

    const swatch = document.createElement("span");
    const style = kindStyle(String(node.data("kind")));
    swatch.className = "graph-search-result-swatch";
    swatch.style.background = style.fill;
    swatch.style.borderColor = style.border;

    const label = document.createElement("span");
    label.className = "graph-search-result-label";
    label.textContent = nodeTitle(node, node.id());

    const meta = document.createElement("span");
    meta.className = "graph-search-result-kind";
    meta.textContent = kindLabel(String(node.data("kind")));

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
    moreItem.className = "graph-search-more";
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
    if (resultsRoot?.classList.contains("is-open")) {
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

  if (kinds.has("career") && kinds.has("year")) {
    return 72;
  }

  if (kinds.has("career") && kinds.has("course")) {
    return 96;
  }

  return 80;
}

function edgeLayoutElasticity(edge: cytoscape.EdgeSingular): number {
  if (edge.data("kind") === "concept-tag") {
    return 0.85;
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
  const visibleElements = cy.elements().not(".filtered-out");
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
  const focusEles = buildInducedSubgraph(cy, visibleNodeIds);
  const sessionKey = expansionSessionKey(expansionNodeIds);

  cy.elements().removeClass("focused");
  applyElementVisibility(cy, viewState);

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
    assignExpansionAnchorColor(viewState, nodeId);
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

function structuralKindRank(kind: string | undefined): number | undefined {
  if (kind === "career") {
    return 0;
  }

  if (kind === "year") {
    return 1;
  }

  if (kind === "course") {
    return 2;
  }

  return undefined;
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

  const sourceRank = structuralKindRank(kindById.get(source));
  const targetRank = structuralKindRank(kindById.get(target));
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
      return {
        ...node,
        data: {
          ...node.data,
          title: capitalizeWords(rawTitle),
          label: typeof label === "string" ? formatGraphNodeLabel(label) : label,
        },
      };
    }),
    edges: elements.edges ? unifyBidirectionalEdges(elements.edges, kindById) : elements.edges,
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

export async function mountGraph(
  containerId: string,
  dataUrl: string,
  options: MountGraphOptions = {},
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing graph container #${containerId}`);
  }

  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load graph (${response.status})`);
  }

  const [graphText, conceptPagesBySlug] = await Promise.all([
    response.text(),
    options.conceptNotesUrl
      ? loadConceptPages(options.conceptNotesUrl).catch((error) => {
          console.error(error);
          return new Map<string, ConceptPage>();
        })
      : Promise.resolve(new Map<string, ConceptPage>()),
  ]);

  const payload = parseGeneratedPayload<{ elements: cytoscape.ElementsDefinition }>(graphText);

  const cy = cytoscape({
    container,
    elements: prepareGraphElements(payload.elements),
    layout: graphLayoutOptions(),
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
          "font-family": "Roboto, sans-serif",
          "font-weight": 700,
          "text-wrap": "wrap",
          "text-max-width": 52,
          width: 58,
          height: 58,
          "background-color": "#e2e8f0",
          "border-width": 2,
          "border-color": "#64748b",
          color: "#111827",
          cursor: "grab",
        },
      },
      {
        selector: "node:active",
        style: {
          cursor: "grabbing",
        },
      },
      {
        selector: "node[kind = 'career']",
        style: {
          "background-color": "#ddd6fe",
          "border-color": "#7c3aed",
        },
      },
      {
        selector: "node[kind = 'year']",
        style: {
          "background-color": "#fde68a",
          "border-color": "#d97706",
        },
      },
      {
        selector: "node[kind = 'course']",
        style: {
          "background-color": "#bbf7d0",
          "border-color": "#059669",
          width: 76,
          height: 76,
          "font-size": 8,
          "text-max-width": 70,
          "line-height": 1.15,
        },
      },
      {
        selector: "node[kind = 'concept']",
        style: {
          "background-color": "#bfdbfe",
          "border-color": "#2563eb",
          width: 42,
          height: 42,
          "font-size": 6,
          "text-max-width": 36,
          "font-family": "Roboto, sans-serif",
          "font-weight": 700,
        },
      },
      {
        selector: "node.focused",
        style: {
          "border-width": 3,
          "border-color": "#f59e0b",
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
          "line-color": "#94a3b8",
          "target-arrow-color": "#94a3b8",
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
    ],
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
  };

  const ui: GraphUi = {
    expansionListRoot,
    syncView: (fit = false) => {
      applyElementVisibility(cy, viewState);
      applyExpansionEdgeColors(cy, viewState);
      updateExpansionListUI(cy, viewState, expansionListRoot, ui);
      cy.resize();
      if (fit) {
        fitVisibleGraph(cy);
      }
    },
  };

  const resetFiltersButton = options.resetFiltersButtonId
    ? document.getElementById(options.resetFiltersButtonId)
    : null;

  if (filtersRoot) {
    mountKindFilters(cy, viewState, ui, filtersRoot);
  }

  if (filtersRoot && resetFiltersButton instanceof HTMLButtonElement) {
    mountResetFiltersButton(cy, viewState, ui, filtersRoot, resetFiltersButton);
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

  cy.on("layoutstop", () => {
    if (!viewState.initialLayoutSaved) {
      viewState.fullGraphPositions = snapshotPositions(cy);
      viewState.initialLayoutSaved = true;
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
    openInCms(cmsBase, slug);
  });
}
