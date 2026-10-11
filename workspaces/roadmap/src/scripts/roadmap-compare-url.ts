export interface RoadmapCompareUrlState {
  a?: string;
  b?: string;
}

export function roadmapComparePathSuffix(): string {
  return "/compare";
}

/** True when the app should render the degree-compare view (not the main roadmap). */
export function isRoadmapCompareRoute(pathname = window.location.pathname): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized.endsWith("/roadmap/compare") || normalized.endsWith("/compare");
}

export function readRoadmapCompareUrl(search = window.location.search): RoadmapCompareUrlState {
  const params = new URLSearchParams(search);
  const a = params.get("a")?.trim();
  const b = params.get("b")?.trim();
  return {
    a: a || undefined,
    b: b || undefined,
  };
}

const compareUrlListeners = new Set<() => void>();

function notifyCompareUrlListeners(): void {
  for (const listener of compareUrlListeners) {
    listener();
  }
}

export function subscribeRoadmapCompareUrl(onStoreChange: () => void): () => void {
  compareUrlListeners.add(onStoreChange);
  const onPopState = (): void => {
    onStoreChange();
  };
  window.addEventListener("popstate", onPopState);
  return () => {
    compareUrlListeners.delete(onStoreChange);
    window.removeEventListener("popstate", onPopState);
  };
}

export function writeRoadmapCompareUrl(
  state: RoadmapCompareUrlState,
  mode: "replace" | "push" = "replace",
): void {
  const params = new URLSearchParams();
  if (state.a) {
    params.set("a", state.a);
  }
  if (state.b) {
    params.set("b", state.b);
  }

  const base = import.meta.env.BASE_URL ?? "/roadmap/";
  const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
  const query = params.toString();
  const nextUrl = `${basePath}/compare${query ? `?${query}` : ""}`;

  if (mode === "push") {
    window.history.pushState(null, "", nextUrl);
  } else {
    window.history.replaceState(null, "", nextUrl);
  }

  notifyCompareUrlListeners();
}

export function roadmapCompareUrlKey(state: RoadmapCompareUrlState): string {
  return `${state.a ?? ""}|${state.b ?? ""}`;
}

export function getRoadmapCompareUrlSnapshot(): string {
  return roadmapCompareUrlKey(readRoadmapCompareUrl());
}
