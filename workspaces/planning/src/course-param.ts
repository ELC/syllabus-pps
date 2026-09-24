const COURSE_PARAM = "course";
const DEGREE_PARAM = "degree";

export function readCourseParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(COURSE_PARAM);
  return value?.trim() || null;
}

export function readDegreeParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(DEGREE_PARAM);
  return value?.trim() || null;
}

export function writePlanningUrlParams(
  courseSlug: string,
  degreeSlug: string,
  mode: "push" | "replace" = "push",
): void {
  const url = new URL(window.location.href);
  const course = courseSlug.trim();
  const degree = degreeSlug.trim();

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
