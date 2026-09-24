function siteRootPrefix(siteRoot: string): string {
  return siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
}

export function cmsCoursePageHref(siteRoot: string, courseSlug: string): string {
  const params = new URLSearchParams({ page: courseSlug.trim() });
  return `${siteRootPrefix(siteRoot)}cms/?${params.toString()}`;
}

export function planningCoursePageHref(
  siteRoot: string,
  courseSlug: string,
  degreeSlug?: string | null,
): string {
  const params = new URLSearchParams({ course: courseSlug.trim() });
  const degree = degreeSlug?.trim();
  if (degree) {
    params.set("degree", degree);
  }
  return `${siteRootPrefix(siteRoot)}planning/?${params.toString()}`;
}

export function networkCourseExpansionHref(siteRoot: string, courseSlug: string): string {
  const params = new URLSearchParams({
    expand: courseSlug.trim(),
    courseLinks: "mentions",
  });
  return `${siteRootPrefix(siteRoot)}network/?${params.toString()}`;
}

export function networkDegreeExpansionHref(siteRoot: string, degreeSlug: string): string {
  const params = new URLSearchParams({ expand: degreeSlug.trim() });
  return `${siteRootPrefix(siteRoot)}network/?${params.toString()}`;
}

export function roadmapDegreeOverviewHref(siteRoot: string, degreeSlug: string): string {
  const params = new URLSearchParams({ degree: degreeSlug.trim() });
  return `${siteRootPrefix(siteRoot)}roadmap/?${params.toString()}`;
}

export function roadmapCourseSubgraphHref(
  siteRoot: string,
  degreeSlug: string,
  courseSlug: string,
): string {
  const params = new URLSearchParams({
    degree: degreeSlug.trim(),
    course: courseSlug.trim(),
  });
  return `${siteRootPrefix(siteRoot)}roadmap/?${params.toString()}`;
}
