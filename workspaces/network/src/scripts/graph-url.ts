import { GRAPH_FILTER_KINDS } from "./graph-styles";

export const GRAPH_URL_EXPAND_PARAM = "expand";
export const GRAPH_URL_HIDE_CONCEPTS_PARAM = "hideConcepts";
export const GRAPH_URL_HIDE_YEARS_PARAM = "hideYears";
export const GRAPH_URL_COURSE_LINKS_PARAM = "courseLinks";

export type CourseLinkMode = "mentions" | "correlativas";

export const DEFAULT_GRAPH_CONCEPTS_HIDDEN = true;
export const DEFAULT_GRAPH_YEARS_HIDDEN = true;
export const DEFAULT_GRAPH_COURSE_LINK_MODE: CourseLinkMode = "correlativas";

type KindFilterKey = (typeof GRAPH_FILTER_KINDS)[number]["kind"];

export interface GraphUrlState {
  expansionSlugs: string[];
  filterSlugs: Record<KindFilterKey, string>;
  conceptsHidden: boolean;
  yearsHidden: boolean;
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

function parseBooleanFlag(value: string | null, defaultValue: boolean): boolean {
  if (value === null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  return defaultValue;
}

export function parseGraphUrlState(
  search: string | URLSearchParams = window.location.search,
): GraphUrlState {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const filterSlugs = emptyFilterSlugs();

  for (const { kind } of GRAPH_FILTER_KINDS) {
    filterSlugs[kind] = params.get(kind)?.trim() ?? "";
  }

  const courseLinksParam = params.has(GRAPH_URL_COURSE_LINKS_PARAM)
    ? params.get(GRAPH_URL_COURSE_LINKS_PARAM)?.trim().toLowerCase() ?? ""
    : null;

  return {
    expansionSlugs: parseSlugList(params.get(GRAPH_URL_EXPAND_PARAM)),
    filterSlugs,
    conceptsHidden: parseBooleanFlag(
      params.has(GRAPH_URL_HIDE_CONCEPTS_PARAM)
        ? params.get(GRAPH_URL_HIDE_CONCEPTS_PARAM)
        : null,
      DEFAULT_GRAPH_CONCEPTS_HIDDEN,
    ),
    yearsHidden: parseBooleanFlag(
      params.has(GRAPH_URL_HIDE_YEARS_PARAM) ? params.get(GRAPH_URL_HIDE_YEARS_PARAM) : null,
      DEFAULT_GRAPH_YEARS_HIDDEN,
    ),
    courseLinkMode:
      courseLinksParam === null
        ? DEFAULT_GRAPH_COURSE_LINK_MODE
        : courseLinksParam === "mentions"
          ? "mentions"
          : "correlativas",
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

  if (state.yearsHidden) {
    params.set(GRAPH_URL_HIDE_YEARS_PARAM, "1");
  } else {
    params.delete(GRAPH_URL_HIDE_YEARS_PARAM);
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
