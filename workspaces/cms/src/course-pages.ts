import { normalizeTitle } from "@pps/core";

export interface CoursePageOption {
  slug: string;
  title: string;
}

export function normalizeYearCourseSlugs(
  entries: string[],
  courses: CoursePageOption[],
): string[] {
  if (courses.length === 0) {
    const seen = new Set<string>();
    const preserved: string[] = [];
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      preserved.push(trimmed);
    }
    return preserved.sort((left, right) => left.localeCompare(right, "es-AR"));
  }

  const slugSet = new Set(courses.map((course) => course.slug));
  const slugByTitle = new Map(
    courses.map((course) => [normalizeTitle(course.title), course.slug] as const),
  );
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const slug = slugSet.has(trimmed) ? trimmed : slugByTitle.get(normalizeTitle(trimmed));
    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    normalized.push(slug);
  }

  return normalized.sort((left, right) => left.localeCompare(right, "es-AR"));
}

export function courseTitleBySlug(
  courses: CoursePageOption[],
  slug: string,
): string {
  return courses.find((course) => course.slug === slug)?.title ?? slug;
}
