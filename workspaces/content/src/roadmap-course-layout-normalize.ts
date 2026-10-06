import type {
  RoadmapCourseLayoutDocument,
  RoadmapCourseLayoutYears,
  RoadmapCourseLayoutYearTemplate,
} from "./roadmap-course-layouts-db";

export const ROADMAP_COURSE_GRID_COLUMN_COUNT = 10;

const ROADMAP_COURSE_GRID_COLUMN_COUNT_BY_DEGREE: Readonly<Record<string, number>> = {
  lcd: 12,
};

export function roadmapCourseGridColumnCount(degreeSlug?: string): number {
  if (!degreeSlug) {
    return ROADMAP_COURSE_GRID_COLUMN_COUNT;
  }
  return (
    ROADMAP_COURSE_GRID_COLUMN_COUNT_BY_DEGREE[degreeSlug] ??
    ROADMAP_COURSE_GRID_COLUMN_COUNT
  );
}

const EMPTY_CELL = ".";

function normalizeTemplateAreasRow(row: string, columnCount: number): string {
  const cells = row.trim().split(/\s+/).filter((cell) => cell.length > 0);

  while (cells.length < columnCount) {
    cells.push(EMPTY_CELL);
  }

  if (cells.length > columnCount) {
    return cells.slice(0, columnCount).join(" ");
  }

  return cells.join(" ");
}

export function normalizeRoadmapCourseLayoutYearTemplate(
  template: RoadmapCourseLayoutYearTemplate,
  columnCount: number = ROADMAP_COURSE_GRID_COLUMN_COUNT,
): RoadmapCourseLayoutYearTemplate {
  return {
    templateAreas: template.templateAreas.map((row) =>
      normalizeTemplateAreasRow(row, columnCount),
    ),
  };
}

export function normalizeRoadmapCourseLayoutYears(
  years: RoadmapCourseLayoutYears,
  columnCount: number = ROADMAP_COURSE_GRID_COLUMN_COUNT,
): RoadmapCourseLayoutYears {
  return Object.fromEntries(
    Object.entries(years).map(([year, template]) => [
      year,
      normalizeRoadmapCourseLayoutYearTemplate(template, columnCount),
    ]),
  );
}

export function normalizeRoadmapCourseLayoutDocument(
  layout: RoadmapCourseLayoutDocument,
  columnCount: number = ROADMAP_COURSE_GRID_COLUMN_COUNT,
): RoadmapCourseLayoutDocument {
  return {
    courses: layout.courses,
    years: normalizeRoadmapCourseLayoutYears(layout.years, columnCount),
  };
}
