const COURSE_PARAM = "course";
const DEGREE_PARAM = "degree";
const VIEW_PARAM = "view";
const CONCEPT_PARAM = "concept";

export const PLANNING_CALENDAR_VIEW = "calendar" as const;

export type PlanningViewParam = typeof PLANNING_CALENDAR_VIEW | null;

export function readCourseParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(COURSE_PARAM);
  return value?.trim() || null;
}

export function readDegreeParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(DEGREE_PARAM);
  return value?.trim() || null;
}

export function readPlanningViewParam(): PlanningViewParam {
  const value = new URLSearchParams(window.location.search).get(VIEW_PARAM)?.trim().toLowerCase();
  return value === PLANNING_CALENDAR_VIEW ? PLANNING_CALENDAR_VIEW : null;
}

export function isPlanningCalendarViewParam(): boolean {
  return readPlanningViewParam() === PLANNING_CALENDAR_VIEW;
}

export function readConceptParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(CONCEPT_PARAM);
  return value?.trim() || null;
}

/** Stable key for URL sync (degree|course|view|concept). */
export function planningUrlKey(search = window.location.search): string {
  const params = new URLSearchParams(search);
  const view = params.get(VIEW_PARAM)?.trim().toLowerCase() ?? "";
  const normalizedView = view === PLANNING_CALENDAR_VIEW ? PLANNING_CALENDAR_VIEW : "";
  return `${params.get(DEGREE_PARAM)?.trim() ?? ""}|${params.get(COURSE_PARAM)?.trim() ?? ""}|${normalizedView}|${params.get(CONCEPT_PARAM)?.trim() ?? ""}`;
}

/** Update only `concept=` so closing the slide-out never drops course/degree/view from the URL. */
export function writePlanningConceptParam(
  concept: string | null,
  mode: "push" | "replace" = "push",
): void {
  const url = new URL(window.location.href);
  const trimmed = concept?.trim() ?? "";
  if (trimmed) {
    url.searchParams.set(CONCEPT_PARAM, trimmed);
  } else {
    url.searchParams.delete(CONCEPT_PARAM);
  }

  const next = url.toString();
  if (next !== window.location.href) {
    if (mode === "push") {
      window.history.pushState({}, "", next);
    } else {
      window.history.replaceState({}, "", next);
    }
  }
}

export function writePlanningUrlParams(
  courseSlug: string,
  degreeSlug: string,
  mode: "push" | "replace" = "push",
  view: PlanningViewParam | "preserve" = "preserve",
  concept: string | null | "preserve" = "preserve",
): void {
  const url = new URL(window.location.href);
  const course = courseSlug.trim();
  const degree = degreeSlug.trim();
  const resolvedView = view === "preserve" ? readPlanningViewParam() : view;
  const resolvedConcept = concept === "preserve" ? readConceptParam() : concept?.trim() ?? "";

  if (course) {
    url.searchParams.set(COURSE_PARAM, course);
  } else {
    url.searchParams.delete(COURSE_PARAM);
  }

  if (degree) {
    url.searchParams.set(DEGREE_PARAM, degree);
  } else {
    url.searchParams.delete(DEGREE_PARAM);
  }

  if (resolvedView === PLANNING_CALENDAR_VIEW) {
    url.searchParams.set(VIEW_PARAM, PLANNING_CALENDAR_VIEW);
  } else {
    url.searchParams.delete(VIEW_PARAM);
  }

  if (resolvedConcept) {
    url.searchParams.set(CONCEPT_PARAM, resolvedConcept);
  } else {
    url.searchParams.delete(CONCEPT_PARAM);
  }

  const next = url.toString();
  if (next !== window.location.href) {
    if (mode === "push") {
      window.history.pushState({}, "", next);
    } else {
      window.history.replaceState({}, "", next);
    }
  }
}

/** @deprecated Use writePlanningUrlParams */
export function writeCourseParam(slug: string): void {
  writePlanningUrlParams(slug, readDegreeParam() ?? "");
}
