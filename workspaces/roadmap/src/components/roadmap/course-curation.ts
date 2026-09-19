import ldsCourseCuration from "../../curations/lds-course.json";

export interface CourseCurationEntry {
  slug: string;
}

/** One year band expressed like CSS grid templates. */
export interface YearGridTemplate {
  templateAreas: string[];
}

export interface CourseRoadmapCuration {
  degreeSlug: string;
  courses: Record<string, CourseCurationEntry>;
  years: Record<string, YearGridTemplate>;
}

export interface CuratedCourseDisplayRow {
  year: string;
  withinYearStage: number;
  stage: number;
  titles: string[];
}

export interface CourseGridSlot {
  row: number;
  column: number;
}

const EMPTY_AREA = ".";

const curatedModules = import.meta.glob("../../curations/*-course.json", {
  eager: true,
  import: "default",
}) as Record<string, CourseRoadmapCuration>;

function loadCourseCurations(): Map<string, CourseRoadmapCuration> {
  const curations = new Map<string, CourseRoadmapCuration>();

  for (const curation of Object.values(curatedModules)) {
    curations.set(curation.degreeSlug, curation);
  }

  if (!curations.has(ldsCourseCuration.degreeSlug)) {
    curations.set(ldsCourseCuration.degreeSlug, ldsCourseCuration);
  }

  return curations;
}

const curationsBySlug = loadCourseCurations();

export function getCourseRoadmapCuration(
  degreeSlug: string,
): CourseRoadmapCuration | null {
  return curationsBySlug.get(degreeSlug) ?? null;
}

export function hasCuratedCourseGrid(curation: CourseRoadmapCuration | null): boolean {
  return Boolean(
    curation?.years &&
      Object.values(curation.years).some((year) => year.templateAreas.length > 0),
  );
}

function resolveCourseTitle(
  areaId: string,
  courses: Readonly<Record<string, CourseCurationEntry>>,
  slugToTitle: ReadonlyMap<string, string>,
): string | undefined {
  const entry = courses[areaId];
  if (!entry) {
    return undefined;
  }

  return slugToTitle.get(entry.slug);
}

/** Parse CSS-like template area rows into course grid slots. */
export function parseTemplateAreas(
  templateAreas: string[],
  courses: Readonly<Record<string, CourseCurationEntry>>,
  slugToTitle: ReadonlyMap<string, string>,
): Map<string, CourseGridSlot> {
  const slots = new Map<string, CourseGridSlot>();

  for (const [rowIndex, rowTemplate] of templateAreas.entries()) {
    const cells = rowTemplate.trim().split(/\s+/);

    for (const [columnIndex, cell] of cells.entries()) {
      if (cell === EMPTY_AREA || cell.length === 0) {
        continue;
      }

      const title = resolveCourseTitle(cell, courses, slugToTitle);
      if (!title) {
        continue;
      }

      slots.set(title, { row: rowIndex, column: columnIndex });
    }
  }

  return slots;
}

function courseSlotsFromCuration(
  curation: CourseRoadmapCuration,
  slugToTitle: ReadonlyMap<string, string>,
): Map<string, CourseGridSlot & { year: string }> {
  const slots = new Map<string, CourseGridSlot & { year: string }>();

  for (const [year, template] of Object.entries(curation.years)) {
    for (const [title, slot] of parseTemplateAreas(
      template.templateAreas,
      curation.courses,
      slugToTitle,
    )) {
      slots.set(title, { ...slot, year });
    }
  }

  return slots;
}

export function buildCuratedCourseGrid(
  curation: CourseRoadmapCuration,
  titles: string[],
  yearsByTitle: ReadonlyMap<string, string>,
  stageOf: Map<string, number>,
  sortYears: (years: Iterable<string>) => string[],
  slugToTitle: ReadonlyMap<string, string>,
): { displayRows: CuratedCourseDisplayRow[]; columnOf: Map<string, number> } {
  const slots = courseSlotsFromCuration(curation, slugToTitle);
  const columnOf = new Map<string, number>();
  const rowsByYear = new Map<string, Map<number, string[]>>();

  for (const title of titles) {
    const slot = slots.get(title);
    if (!slot) {
      continue;
    }

    columnOf.set(title, slot.column);
    const year = yearsByTitle.get(title) ?? slot.year;
    const yearRows = rowsByYear.get(year) ?? new Map<number, string[]>();
    const rowTitles = yearRows.get(slot.row) ?? [];
    rowTitles.push(title);
    yearRows.set(slot.row, rowTitles);
    rowsByYear.set(year, yearRows);
  }

  const displayRows: CuratedCourseDisplayRow[] = [];

  for (const year of sortYears(rowsByYear.keys())) {
    const yearRows = rowsByYear.get(year);
    if (!yearRows) {
      continue;
    }

    for (const [rowIndex, rowTitles] of [...yearRows.entries()].sort(
      (left, right) => left[0] - right[0],
    )) {
      const sorted = [...rowTitles].sort(
        (left, right) =>
          (columnOf.get(left) ?? 0) - (columnOf.get(right) ?? 0) ||
          left.localeCompare(right, "es-AR"),
      );

      displayRows.push({
        year,
        withinYearStage: rowIndex,
        stage: Math.max(...sorted.map((title) => stageOf.get(title) ?? 0)),
        titles: sorted,
      });
    }
  }

  return { displayRows, columnOf };
}
