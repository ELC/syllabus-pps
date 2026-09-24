import {
  normalizeTitle,
  PageKind,
  parseYearSlug,
  yearDisplayLabel,
  type ZettelPage,
} from "@pps/core";

import type { MetaDropdownOption } from "@pps/shell/MetaDropdown";

export interface PlanningCatalogItem {
  slug: string;
  title: string;
}

const GROUP_PREFIX = "__planning-group:";

export function planningGroupOptionValue(key: string): string {
  return `${GROUP_PREFIX}${key}`;
}

export function isPlanningGroupOptionValue(value: string): boolean {
  return value.startsWith(GROUP_PREFIX);
}

export function buildDegreeDropdownOptions(
  pages: readonly ZettelPage[],
): MetaDropdownOption<string>[] {
  const degrees = pages
    .filter((page) => page.kind === PageKind.Degree)
    .map((page) => ({ slug: page.slug, title: page.title.trim() || page.slug }))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));

  return [
    { value: "", label: "Todas las carreras" },
    ...degrees.map((degree) => ({ value: degree.slug, label: degree.title })),
  ];
}

function resolveCourseSlugFromRef(
  ref: string,
  courses: readonly PlanningCatalogItem[],
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

export function buildCourseDropdownOptions(
  pages: readonly ZettelPage[],
  courses: readonly PlanningCatalogItem[],
  degreeSlug: string,
): MetaDropdownOption<string>[] {
  const normalizedDegree = degreeSlug.trim();
  if (!normalizedDegree) {
    return [...courses]
      .sort((left, right) => left.title.localeCompare(right.title, "es-AR"))
      .map((course) => ({ value: course.slug, label: course.title }));
  }

  const titleBySlug = new Map(courses.map((course) => [course.slug, course.title] as const));
  const yearPages = pages
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

  const options: MetaDropdownOption<string>[] = [];
  const listed = new Set<string>();

  for (const { page, parsed } of yearPages) {
    const yearIndex = page.yearIndex ?? parsed.yearIndex;
    options.push({
      value: planningGroupOptionValue(`year-${yearIndex}`),
      label: yearDisplayLabel(yearIndex),
      disabled: true,
    });

    const slugsInYear: string[] = [];
    for (const entry of page.courses ?? []) {
      const ref = (entry.resolvedTarget ?? entry.target).trim();
      const slug = resolveCourseSlugFromRef(ref, courses);
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

export function selectableCourseSlugsFromOptions(
  options: readonly MetaDropdownOption<string>[],
): string[] {
  return options.filter((option) => !option.disabled).map((option) => option.value);
}
