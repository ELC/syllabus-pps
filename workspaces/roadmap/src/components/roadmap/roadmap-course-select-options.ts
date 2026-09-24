import {
  normalizeTitle,
  PageKind,
  parseYearSlug,
  yearDisplayLabel,
  type CourseRoadmap,
  type CurriculumGraph,
  type ZettelPage,
} from "@pps/core";
import type { MetaDropdownOption } from "@pps/shell/MetaDropdown";

const GROUP_PREFIX = "__roadmap-group:";

export function isRoadmapCourseGroupOptionValue(value: string): boolean {
  return value.startsWith(GROUP_PREFIX);
}

function roadmapCourseGroupOptionValue(key: string): string {
  return `${GROUP_PREFIX}${key}`;
}

function resolveCourseSlugFromRef(
  ref: string,
  courses: readonly { slug: string; title: string }[],
): string | undefined {
  const trimmed = ref.trim();
  if (!trimmed) {
    return undefined;
  }

  const bySlug = courses.find((course) => course.slug === trimmed);
  if (bySlug) {
    return bySlug.slug;
  }

  const key = normalizeTitle(trimmed);
  return courses.find((course) => normalizeTitle(course.title) === key)?.slug;
}

function flatCourseOptions(
  courses: CourseRoadmap["courses"],
): MetaDropdownOption<string>[] {
  return [...courses]
    .sort(
      (left, right) =>
        left.year.localeCompare(right.year, "es-AR") ||
        left.title.localeCompare(right.title, "es-AR"),
    )
    .map((course) => ({ value: course.slug, label: course.title }));
}

export function buildRoadmapCourseSelectOptions(
  graph: CurriculumGraph | null,
  roadmap: CourseRoadmap | null,
  degreeSelected: boolean,
): MetaDropdownOption<string>[] {
  const head: MetaDropdownOption<string>[] = [{ value: "", label: "Todas" }];
  if (!roadmap) {
    return head;
  }

  if (!degreeSelected || !graph) {
    return [...head, ...flatCourseOptions(roadmap.courses)];
  }

  const catalog = roadmap.courses.map((course) => ({
    slug: course.slug,
    title: course.title,
  }));
  const titleBySlug = new Map(catalog.map((course) => [course.slug, course.title] as const));
  const normalizedDegree = roadmap.degreeSlug.trim();

  const yearPages = graph.pages
    .filter((page) => page.kind === PageKind.Year)
    .map((page) => ({ page, parsed: parseYearSlug(page.slug) }))
    .filter(
      (entry): entry is { page: ZettelPage; parsed: { degreeSlug: string; yearIndex: number } } =>
        Boolean(entry.parsed && entry.parsed.degreeSlug === normalizedDegree),
    )
    .sort((left, right) => {
      const leftIndex = left.page.yearIndex ?? left.parsed.yearIndex;
      const rightIndex = right.page.yearIndex ?? right.parsed.yearIndex;
      return leftIndex - rightIndex;
    });

  const options: MetaDropdownOption<string>[] = [...head];
  const listed = new Set<string>();

  for (const { page, parsed } of yearPages) {
    const yearIndex = page.yearIndex ?? parsed.yearIndex;
    options.push({
      value: roadmapCourseGroupOptionValue(`year-${yearIndex}`),
      label: yearDisplayLabel(yearIndex),
      disabled: true,
    });

    const slugsInYear: string[] = [];
    for (const entry of page.courses ?? []) {
      const ref = (entry.resolvedTarget ?? entry.target).trim();
      const slug = resolveCourseSlugFromRef(ref, catalog);
      if (!slug || listed.has(slug)) {
        continue;
      }
      listed.add(slug);
      slugsInYear.push(slug);
    }

    slugsInYear.sort((left, right) =>
      (titleBySlug.get(left) ?? left).localeCompare(titleBySlug.get(right) ?? right, "es-AR"),
    );

    for (const slug of slugsInYear) {
      options.push({
        value: slug,
        label: titleBySlug.get(slug) ?? slug,
        indent: true,
      });
    }
  }

  return options;
}
