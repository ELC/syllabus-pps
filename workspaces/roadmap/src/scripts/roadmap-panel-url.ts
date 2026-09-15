export interface RoadmapPanelUrlState {
  career?: string;
  concept?: string;
  capstone?: string;
}

export function readRoadmapPanelUrl(search = window.location.search): RoadmapPanelUrlState {
  const params = new URLSearchParams(search);
  const career = params.get("career")?.trim();
  const concept = params.get("concept")?.trim();
  const capstone = params.get("capstone")?.trim();

  return {
    career: career || undefined,
    concept: concept || undefined,
    capstone: capstone || undefined,
  };
}

export function writeRoadmapPanelUrl(
  state: RoadmapPanelUrlState,
  mode: "replace" | "push" = "replace",
): void {
  const params = new URLSearchParams(window.location.search);
  params.delete("concept");
  params.delete("capstone");

  if (state.career) {
    params.set("career", state.career);
  } else {
    params.delete("career");
  }

  if (state.concept) {
    params.set("concept", state.concept);
  }

  if (state.capstone) {
    params.set("capstone", state.capstone);
  }

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;

  if (mode === "push") {
    window.history.pushState(null, "", nextUrl);
    return;
  }

  window.history.replaceState(null, "", nextUrl);
}

export function roadmapPanelUrlKey(state: RoadmapPanelUrlState): string {
  return `${state.career ?? ""}|${state.concept ?? ""}|${state.capstone ?? ""}`;
}
