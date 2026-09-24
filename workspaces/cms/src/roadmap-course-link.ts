import { normalizeTitle, PageKind, parseYearSlug } from "@pps/core";

import { normalizeYearCourseSlugs, type CoursePageOption } from "./course-pages";
import { splitPageDocument } from "./page-document";

function yearGridIncludesCourse(
  yearCourses: readonly string[],
  courseSlug: string,
  courseTitle: string,
  coursePages: readonly CoursePageOption[],
): boolean {
  const slug = courseSlug.trim();
  if (!slug) {
    return false;
  }

  const normalizedSlugs = normalizeYearCourseSlugs([...yearCourses], [...coursePages]);
  if (normalizedSlugs.includes(slug)) {
    return true;
  }

  const titleKey = normalizeTitle(courseTitle);
  for (const entry of yearCourses) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === slug || normalizeTitle(trimmed) === titleKey) {
      return true;
    }
  }

  return false;
}

/** Degree slug for a course assigned on a year page grid (`kind: year`). */
export function degreeSlugForCourseInSources(
  allSources: ReadonlyArray<{ path: string; content: string }>,
  courseSlug: string,
  coursePages: readonly CoursePageOption[],
  courseTitle = "",
): string | undefined {
  const normalizedCourse = courseSlug.trim();
  if (!normalizedCourse) {
    return undefined;
  }

  for (const page of allSources) {
    const fileSlug = page.path.replace(/\.md$/i, "");
    const parsedYear = parseYearSlug(fileSlug);
    if (!parsedYear) {
      continue;
    }

    const { metadata } = splitPageDocument(page.content, fileSlug);
    if (metadata.kind !== PageKind.Year) {
      continue;
    }

    if (
      yearGridIncludesCourse(metadata.courses, normalizedCourse, courseTitle, coursePages) ||
      yearGridIncludesCourse(
        metadata.coursesNoEstructurado,
        normalizedCourse,
        courseTitle,
        coursePages,
      )
    ) {
      return parsedYear.degreeSlug;
    }
  }

  return undefined;
}

/** Parent degree slug for a year page (from slug pattern or frontmatter `degree`). */
export function degreeSlugForYearPage(
  pageSlug: string,
  metadata: { degree?: string },
  degreeSlugByTitle: ReadonlyMap<string, string>,
): string | undefined {
  const parsed = parseYearSlug(pageSlug.trim());
  if (parsed?.degreeSlug) {
    return parsed.degreeSlug;
  }

  const degreeKey = metadata.degree?.trim();
  if (!degreeKey) {
    return undefined;
  }

  return degreeSlugByTitle.get(degreeKey) ?? degreeKey;
}

export { roadmapCourseSubgraphHref } from "@pps/shell/workspace-links";
