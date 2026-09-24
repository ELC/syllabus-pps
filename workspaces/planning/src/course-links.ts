import { normalizeTitle, PageKind, parseYearSlug, type ZettelPage } from "@pps/core";
import {
  cmsCoursePageHref,
  networkCourseExpansionHref,
  planningCoursePageHref,
  roadmapCourseSubgraphHref,
} from "@pps/shell/workspace-links";

export {
  cmsCoursePageHref,
  networkCourseExpansionHref,
  planningCoursePageHref,
  roadmapCourseSubgraphHref,
};

export function degreeSlugForCoursePage(
  pages: readonly ZettelPage[],
  courseSlug: string,
): string | undefined {
  const normalizedCourseSlug = courseSlug.trim();
  if (!normalizedCourseSlug) {
    return undefined;
  }

  const coursePage = pages.find(
    (page) => page.kind === PageKind.Course && page.slug === normalizedCourseSlug,
  );
  const courseTitleKey = coursePage?.normalizedTitle ?? normalizeTitle(normalizedCourseSlug);
  const courseSlugKey = normalizeTitle(normalizedCourseSlug);

  for (const page of pages) {
    if (page.kind !== PageKind.Year) {
      continue;
    }
    const parsedYear = parseYearSlug(page.slug);
    if (!parsedYear) {
      continue;
    }
    for (const entry of page.courses ?? []) {
      const ref = (entry.resolvedTarget ?? entry.target).trim();
      if (!ref) {
        continue;
      }
      if (
        ref === normalizedCourseSlug ||
        normalizeTitle(ref) === courseTitleKey ||
        normalizeTitle(ref) === courseSlugKey
      ) {
        return parsedYear.degreeSlug;
      }
    }
  }

  return undefined;
}
