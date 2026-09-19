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

function writeBooleanUrlParam(
  params: URLSearchParams,
  key: string,
  value: boolean,
  defaultValue: boolean,
): void {
  if (value === defaultValue) {
    params.delete(key);
  } else {
    params.set(key, value ? "1" : "0");
  }
}

function writeCourseLinksParam(params: URLSearchParams, mode: CourseLinkMode): void {
  if (mode === DEFAULT_GRAPH_COURSE_LINK_MODE) {
    params.delete(GRAPH_URL_COURSE_LINKS_PARAM);
  } else {
    params.set(GRAPH_URL_COURSE_LINKS_PARAM, mode);
  }
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

  writeBooleanUrlParam(
    params,
    GRAPH_URL_HIDE_CONCEPTS_PARAM,
    state.conceptsHidden,
    DEFAULT_GRAPH_CONCEPTS_HIDDEN,
  );
  writeBooleanUrlParam(
    params,
    GRAPH_URL_HIDE_YEARS_PARAM,
    state.yearsHidden,
    DEFAULT_GRAPH_YEARS_HIDDEN,
  );
  writeCourseLinksParam(params, state.courseLinkMode);

  const next = `${url.pathname}${params.toString() ? `?${params.toString()}` : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState({}, "", next);
  }
}
