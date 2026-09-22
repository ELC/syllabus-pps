import type {
  RoadmapCourseLayoutDocument,
  RoadmapCourseLayoutYears,
  RoadmapCourseLayoutYearTemplate,
} from "./roadmap-course-layouts-db";

export const ROADMAP_COURSE_GRID_COLUMN_COUNT = 10;

const EMPTY_CELL = ".";

function normalizeTemplateAreasRow(row: string): string {
  const cells = row.trim().split(/\s+/).filter((cell) => cell.length > 0);

  while (cells.length < ROADMAP_COURSE_GRID_COLUMN_COUNT) {
    cells.push(EMPTY_CELL);
  }

  if (cells.length > ROADMAP_COURSE_GRID_COLUMN_COUNT) {
    return cells.slice(0, ROADMAP_COURSE_GRID_COLUMN_COUNT).join(" ");
  }

  return cells.join(" ");
}

export function normalizeRoadmapCourseLayoutYearTemplate(
  template: RoadmapCourseLayoutYearTemplate,
): RoadmapCourseLayoutYearTemplate {
  return {
    templateAreas: template.templateAreas.map(normalizeTemplateAreasRow),
  };
}

export function normalizeRoadmapCourseLayoutYears(
  years: RoadmapCourseLayoutYears,
): RoadmapCourseLayoutYears {
  return Object.fromEntries(
    Object.entries(years).map(([year, template]) => [
      year,
      normalizeRoadmapCourseLayoutYearTemplate(template),
    ]),
  );
}

export function normalizeRoadmapCourseLayoutDocument(
  layout: RoadmapCourseLayoutDocument,
): RoadmapCourseLayoutDocument {
  return {
    courses: layout.courses,
    years: normalizeRoadmapCourseLayoutYears(layout.years),
  };
}
