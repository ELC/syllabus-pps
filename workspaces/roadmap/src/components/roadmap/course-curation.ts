import {
  normalizeRoadmapCourseLayoutDocument,
  normalizeRoadmapCourseLayoutYears,
  type RoadmapCourseLayoutDocument,
} from "@pps/content";

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

export function buildCourseRoadmapCuration(
  degreeSlug: string,
  layout: RoadmapCourseLayoutDocument | null | undefined,
): CourseRoadmapCuration | null {
  if (!layout || !hasCuratedCourseGridLayout(layout)) {
    return null;
  }

  return {
    degreeSlug,
    courses: layout.courses,
    years: normalizeRoadmapCourseLayoutYears(layout.years),
  };
}

export function hasCuratedCourseGrid(curation: CourseRoadmapCuration | null): boolean {
  return hasCuratedCourseGridLayout(curation);
}

function hasCuratedCourseGridLayout(
  layout: Pick<CourseRoadmapCuration, "years"> | null | undefined,
): boolean {
  return Boolean(
    layout?.years &&
      Object.values(layout.years).some((year) => year.templateAreas.length > 0),
  );
}

export function resolveCourseTitleFromRegistry(
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

function resolveCourseTitle(
  areaId: string,
  courses: Readonly<Record<string, CourseCurationEntry>>,
  slugToTitle: ReadonlyMap<string, string>,
): string | undefined {
  return resolveCourseTitleFromRegistry(areaId, courses, slugToTitle);
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

function templateToGrid(templateAreas: string[]): string[][] {
  return templateAreas.map((row) => row.trim().split(/\s+/));
}

function gridToTemplate(grid: string[][]): string[] {
  return grid.map((row) => row.join(" "));
}

export function resolveAreaIdForTitle(
  curation: CourseRoadmapCuration,
  title: string,
  slugToTitle: ReadonlyMap<string, string>,
): string | undefined {
  for (const [areaId, entry] of Object.entries(curation.courses)) {
    if (slugToTitle.get(entry.slug) === title) {
      return areaId;
    }
  }

  return undefined;
}

export interface CourseGridPosition {
  year: string;
  row: number;
  column: number;
}

function findAreaPosition(
  years: Record<string, YearGridTemplate>,
  areaId: string,
): CourseGridPosition | null {
  for (const [year, template] of Object.entries(years)) {
    const grid = templateToGrid(template.templateAreas);
    for (let row = 0; row < grid.length; row += 1) {
      for (let column = 0; column < grid[row]!.length; column += 1) {
        if (grid[row]![column] === areaId) {
          return { year, row, column };
        }
      }
    }
  }

  return null;
}

/** Move or swap a course area id onto another template cell (same predefined grid). */
export function moveAreaInCourseGrid(
  curation: CourseRoadmapCuration,
  areaId: string,
  target: CourseGridPosition,
): CourseRoadmapCuration {
  const years = structuredClone(normalizeRoadmapCourseLayoutYears(curation.years));
  const from = findAreaPosition(years, areaId);
  if (!from) {
    return curation;
  }

  const targetTemplate = years[target.year];
  if (!targetTemplate) {
    return curation;
  }

  const targetGrid = templateToGrid(targetTemplate.templateAreas);
  const targetRow = targetGrid[target.row];
  if (!targetRow || target.column >= targetRow.length) {
    return curation;
  }

  if (
    from.year === target.year &&
    from.row === target.row &&
    from.column === target.column
  ) {
    return curation;
  }

  if (from.year === target.year) {
    const grid = templateToGrid(years[from.year]!.templateAreas);
    const displaced = grid[target.row]![target.column]!;
    grid[from.row]![from.column] = displaced === areaId ? "." : displaced;
    grid[target.row]![target.column] = areaId;
    years[from.year]!.templateAreas = gridToTemplate(grid);
  } else {
    const sourceGrid = templateToGrid(years[from.year]!.templateAreas);
    const displaced = targetRow[target.column]!;
    targetRow[target.column] = areaId;
    years[target.year]!.templateAreas = gridToTemplate(targetGrid);
    sourceGrid[from.row]![from.column] =
      displaced !== "." && displaced.length > 0 ? displaced : ".";
    years[from.year]!.templateAreas = gridToTemplate(sourceGrid);
  }

  return {
    ...curation,
    years: normalizeRoadmapCourseLayoutYears(years),
  };
}

export function courseLayoutDocumentFromCuration(
  curation: CourseRoadmapCuration,
): RoadmapCourseLayoutDocument {
  return normalizeRoadmapCourseLayoutDocument({
    courses: curation.courses,
    years: curation.years,
  });
}
