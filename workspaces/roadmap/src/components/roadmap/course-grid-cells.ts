import type { CuratedCourseDisplayRow } from "./course-curation";
import {
  type CourseRoadmapCuration,
  resolveCourseTitleFromRegistry,
} from "./course-curation";
import type { CourseGridCell } from "./layout";

export function findNearestGridCell(
  cells: CourseGridCell[],
  centerX: number,
  centerY: number,
): CourseGridCell | null {
  if (cells.length === 0) {
    return null;
  }

  let best: CourseGridCell | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const cell of cells) {
    const dx = cell.centerX - centerX;
    const dy = cell.centerY - centerY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cell;
    }
  }

  return best;
}

/** Pixel positions for every template cell that shares a laid-out row. */
export function buildCuratedGridCells(options: {
  curation: CourseRoadmapCuration;
  displayRows: CuratedCourseDisplayRow[];
  placements: Map<string, { y: number }>;
  graphCenter: number;
  stride: number;
  nodeWidth: number;
  nodeHeight: number;
  slugToTitle: ReadonlyMap<string, string>;
}): CourseGridCell[] {
  const {
    curation,
    displayRows,
    placements,
    graphCenter,
    stride,
    nodeWidth,
    nodeHeight,
    slugToTitle,
  } = options;

  const rowYByYearStage = new Map<string, number>();
  for (const row of displayRows) {
    const anchorTitle = row.titles[0];
    if (!anchorTitle) {
      continue;
    }
    const y = placements.get(anchorTitle)?.y;
    if (y !== undefined) {
      rowYByYearStage.set(`${row.year}:${row.withinYearStage}`, y);
    }
  }

  const cells: CourseGridCell[] = [];

  for (const [year, template] of Object.entries(curation.years)) {
    for (const [rowIndex, rowTemplate] of template.templateAreas.entries()) {
      const y = rowYByYearStage.get(`${year}:${rowIndex}`);
      if (y === undefined) {
        continue;
      }

      const tokens = rowTemplate.trim().split(/\s+/);
      for (const [columnIndex, token] of tokens.entries()) {
        const centerX = (columnIndex - graphCenter) * stride;
        const x = centerX - nodeWidth / 2;
        const title =
          token === "." || token.length === 0
            ? undefined
            : resolveCourseTitleFromRegistry(token, curation.courses, slugToTitle);

        cells.push({
          year,
          row: rowIndex,
          column: columnIndex,
          x,
          y,
          width: nodeWidth,
          height: nodeHeight,
          centerX,
          centerY: y + nodeHeight / 2,
          title,
        });
      }
    }
  }

  return cells;
}
