import { GRAPH_FILTER_KINDS } from "./graph-styles";

export const GRAPH_URL_EXPAND_PARAM = "expand";
export const GRAPH_URL_HIDE_CONCEPTS_PARAM = "hideConcepts";
export const GRAPH_URL_COURSE_LINKS_PARAM = "courseLinks";

export type CourseLinkMode = "mentions" | "correlativas";

type KindFilterKey = (typeof GRAPH_FILTER_KINDS)[number]["kind"];

export interface GraphUrlState {
  expansionSlugs: string[];
  filterSlugs: Record<KindFilterKey, string>;
  conceptsHidden: boolean;
  courseLinkMode: CourseLinkMode;
}

function emptyFilterSlugs(): Record<KindFilterKey, string> {
  return {
    degree: "",
    year: "",
    course: "",
    concept: "",
  };
}

function parseSlugList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const slugs: string[] = [];

  for (const part of value.split(",")) {
    const slug = part.trim();
    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    slugs.push(slug);
  }

  return slugs;
}

function parseTruthyFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parseGraphUrlState(
  search: string | URLSearchParams = window.location.search,
): GraphUrlState {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const filterSlugs = emptyFilterSlugs();

  for (const { kind } of GRAPH_FILTER_KINDS) {
    filterSlugs[kind] = params.get(kind)?.trim() ?? "";
  }

  const courseLinksParam = params.get(GRAPH_URL_COURSE_LINKS_PARAM)?.trim().toLowerCase() ?? "";

  return {
    expansionSlugs: parseSlugList(params.get(GRAPH_URL_EXPAND_PARAM)),
    filterSlugs,
    conceptsHidden: parseTruthyFlag(params.get(GRAPH_URL_HIDE_CONCEPTS_PARAM)),
    courseLinkMode: courseLinksParam === "correlativas" ? "correlativas" : "mentions",
  };
}

export function writeGraphUrlState(state: GraphUrlState): void {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (state.expansionSlugs.length > 0) {
    params.set(GRAPH_URL_EXPAND_PARAM, state.expansionSlugs.join(","));
  } else {
    params.delete(GRAPH_URL_EXPAND_PARAM);
  }

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const slug = state.filterSlugs[kind];
    if (slug) {
      params.set(kind, slug);
    } else {
      params.delete(kind);
    }
  }

  if (state.conceptsHidden) {
    params.set(GRAPH_URL_HIDE_CONCEPTS_PARAM, "1");
  } else {
    params.delete(GRAPH_URL_HIDE_CONCEPTS_PARAM);
  }

  if (state.courseLinkMode === "correlativas") {
    params.set(GRAPH_URL_COURSE_LINKS_PARAM, "correlativas");
  } else {
    params.delete(GRAPH_URL_COURSE_LINKS_PARAM);
  }

  const next = `${url.pathname}${params.toString() ? `?${params.toString()}` : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState({}, "", next);
  }
}
