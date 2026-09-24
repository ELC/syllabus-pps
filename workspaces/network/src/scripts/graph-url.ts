import { GRAPH_FILTER_KINDS } from "./graph-styles";

export const GRAPH_URL_EXPAND_PARAM = "expand";
export const GRAPH_URL_HIDE_CONCEPTS_PARAM = "hideConcepts";
export const GRAPH_URL_COURSE_LINKS_PARAM = "courseLinks";
/** Selected degree in the Carrera dropdown (`Todas` when absent). */
export const GRAPH_URL_DEGREE_SCOPE_PARAM = "degree";

export type CourseLinkMode = "mentions" | "correlativas";

export const DEFAULT_GRAPH_CONCEPTS_HIDDEN = true;
export const DEFAULT_GRAPH_COURSE_LINK_MODE: CourseLinkMode = "correlativas";

type KindFilterKey = (typeof GRAPH_FILTER_KINDS)[number]["kind"];

const KIND_FILTER_URL_PARAM: Record<KindFilterKey, string> = {
  degree: "filterDegree",
  year: "filterYear",
  course: "filterCourse",
  concept: "filterConcept",
};

/** @deprecated Dev/bookmark alias for {@link GRAPH_URL_DEGREE_SCOPE_PARAM}. */
const LEGACY_DEGREE_SCOPE_PARAM = "carrera";

export interface GraphUrlState {
  expansionSlugs: string[];
  filterSlugs: Record<KindFilterKey, string>;
  conceptsHidden: boolean;
  degreeScopeSlug: string;
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

function parseCourseLinkMode(raw: string | null): CourseLinkMode {
  if (raw === null) {
    return DEFAULT_GRAPH_COURSE_LINK_MODE;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "mentions") {
    return "mentions";
  }

  if (
    normalized === "correlativas" ||
    normalized === "prerequisites" ||
    normalized === "prerequisite"
  ) {
    return "correlativas";
  }

  return DEFAULT_GRAPH_COURSE_LINK_MODE;
}

function writeCourseLinksParam(params: URLSearchParams, mode: CourseLinkMode): void {
  if (mode === DEFAULT_GRAPH_COURSE_LINK_MODE) {
    params.delete(GRAPH_URL_COURSE_LINKS_PARAM);
  } else {
    params.set(GRAPH_URL_COURSE_LINKS_PARAM, "mentions");
  }
}

function parseDegreeScopeSlug(params: URLSearchParams): string {
  const scoped =
    params.get(GRAPH_URL_DEGREE_SCOPE_PARAM)?.trim() ??
    params.get(LEGACY_DEGREE_SCOPE_PARAM)?.trim() ??
    "";
  if (scoped) {
    return scoped;
  }

  // Legacy: sidebar kind filter shared the bare `degree` key before scope used `carrera`.
  const legacyFilterDegree = params.get("degree")?.trim();
  if (legacyFilterDegree && !params.has(KIND_FILTER_URL_PARAM.degree)) {
    return legacyFilterDegree;
  }

  return "";
}

function parseKindFilterSlugs(params: URLSearchParams): Record<KindFilterKey, string> {
  const filterSlugs = emptyFilterSlugs();

  for (const { kind } of GRAPH_FILTER_KINDS) {
    const param = KIND_FILTER_URL_PARAM[kind];
    const slug = params.get(param)?.trim() ?? "";
    if (slug) {
      filterSlugs[kind] = slug;
      continue;
    }

    // Legacy URLs used kind names as query keys (e.g. `year=`).
    if (kind !== "degree") {
      const legacy = params.get(kind)?.trim() ?? "";
      if (legacy) {
        filterSlugs[kind] = legacy;
      }
    }
  }

  return filterSlugs;
}

export function parseGraphUrlState(
  search: string | URLSearchParams = window.location.search,
): GraphUrlState {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;

  const courseLinksParam = params.has(GRAPH_URL_COURSE_LINKS_PARAM)
    ? params.get(GRAPH_URL_COURSE_LINKS_PARAM)
    : null;

  return {
    expansionSlugs: parseSlugList(params.get(GRAPH_URL_EXPAND_PARAM)),
    filterSlugs: parseKindFilterSlugs(params),
    conceptsHidden: parseBooleanFlag(
      params.has(GRAPH_URL_HIDE_CONCEPTS_PARAM)
        ? params.get(GRAPH_URL_HIDE_CONCEPTS_PARAM)
        : null,
      DEFAULT_GRAPH_CONCEPTS_HIDDEN,
    ),
    degreeScopeSlug: parseDegreeScopeSlug(params),
    courseLinkMode: parseCourseLinkMode(courseLinksParam),
  };
}

export function writeGraphUrlState(
  state: GraphUrlState,
  mode: "push" | "replace" = "replace",
): void {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  params.delete(LEGACY_DEGREE_SCOPE_PARAM);

  if (state.expansionSlugs.length > 0) {
    params.set(GRAPH_URL_EXPAND_PARAM, state.expansionSlugs.join(","));
  } else {
    params.delete(GRAPH_URL_EXPAND_PARAM);
  }

  for (const { kind } of GRAPH_FILTER_KINDS) {
    params.delete(kind);
    const param = KIND_FILTER_URL_PARAM[kind];
    const slug = state.filterSlugs[kind];
    if (slug) {
      params.set(param, slug);
    } else {
      params.delete(param);
    }
  }

  writeBooleanUrlParam(
    params,
    GRAPH_URL_HIDE_CONCEPTS_PARAM,
    state.conceptsHidden,
    DEFAULT_GRAPH_CONCEPTS_HIDDEN,
  );

  if (state.degreeScopeSlug) {
    params.set(GRAPH_URL_DEGREE_SCOPE_PARAM, state.degreeScopeSlug);
  } else {
    params.delete(GRAPH_URL_DEGREE_SCOPE_PARAM);
  }

  writeCourseLinksParam(params, state.courseLinkMode);

  const next = `${url.pathname}${params.toString() ? `?${params.toString()}` : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    if (mode === "push") {
      window.history.pushState({}, "", next);
    } else {
      window.history.replaceState({}, "", next);
    }
  }
}
