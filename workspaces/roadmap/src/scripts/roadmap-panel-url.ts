export interface RoadmapPanelUrlState {
  degree?: string;
  course?: string;
  concept?: string;
}

export function readRoadmapPanelUrl(search = window.location.search): RoadmapPanelUrlState {
  const params = new URLSearchParams(search);
  const degree = params.get("degree")?.trim();
  const course = params.get("course")?.trim();
  const concept = params.get("concept")?.trim();

  return {
    degree: degree || undefined,
    course: course || undefined,
    concept: concept || undefined,
  };
}

export function writeRoadmapPanelUrl(
  state: RoadmapPanelUrlState,
  mode: "replace" | "push" = "replace",
): void {
  const params = new URLSearchParams(window.location.search);
  params.delete("course");
  params.delete("concept");
  params.delete("capstone");

  if (state.degree) {
    params.set("degree", state.degree);
  } else {
    params.delete("degree");
  }

  if (state.course) {
    params.set("course", state.course);
  }

  if (state.concept) {
    params.set("concept", state.concept);
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
  return `${state.degree ?? ""}|${state.course ?? ""}|${state.concept ?? ""}`;
}
