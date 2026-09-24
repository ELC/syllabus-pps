import {
  degreeRoadmapNodeTitles,
  topologicalDegreeRoadmapStages,
  type CurriculumPageSlug,
  type DegreeRoadmap,
  type DegreeRoadmapAdjacency,
  type DegreeRoadmapNodeTitle,
} from "@pps/core";
import {
  ANCHOR_GAP,
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  COURSE_NODE_HEIGHT,
  COURSE_NODE_WIDTH,
  SPINE_NODE_HEIGHT,
  SPINE_NODE_WIDTH,
} from "./constants";
import {
  appendUnplacedCuratedCourses,
  buildCuratedCourseGrid,
  hasCuratedCourseGrid,
  type CourseRoadmapCuration,
  type CuratedCourseDisplayRow,
} from "./course-curation";
import { buildCuratedGridCells } from "./course-grid-cells";
import {
  resolveCuratedGridMetrics,
  resolveCuratedRowStride,
  type CuratedCourseLayoutMetrics,
} from "./course-layout-metrics";
import type { CourseYearBand, RoadmapBounds, RoadmapLayout, RoadmapPlacement } from "./layout";

/** Horizontal gap between course nodes in the same row (non-curated fallback). */
const COURSE_COLUMN_GAP = 90;
/** Vertical gap between course layers when year grouping is off. */
const COURSE_STAGE_GAP = 144;
/** Extra gap when a year band wraps onto a second row. */
const COURSE_SUBROW_GAP = 64;
/** Extra gap between year bands. */
const COURSE_YEAR_GAP = 112;
/** Split wide year bands so the graph stays readable. */
const MAX_COURSES_PER_ROW = 5;
/** Left gutter reserved for year band labels. */
export const COURSE_YEAR_LABEL_GUTTER = 168;
const COURSE_SAME_BAND_Y_THRESHOLD = 16;

/** Layer index = longest path from entry courses (no correlativas). */
export function assignCourseStages(
  titles: readonly DegreeRoadmapNodeTitle[],
  adjacency: DegreeRoadmapAdjacency,
): Map<DegreeRoadmapNodeTitle, number> {
  const stageOf = new Map<DegreeRoadmapNodeTitle, number>();
  const order = topologicalDegreeRoadmapStages(titles, adjacency).flat();

  for (const title of order) {
    const prerequisites = [...(adjacency.prerequisites.get(title) ?? [])];
    if (prerequisites.length === 0) {
      stageOf.set(title, 0);
      continue;
    }

    stageOf.set(
      title,
      Math.max(...prerequisites.map((prerequisite) => stageOf.get(prerequisite) ?? 0)) + 1,
    );
  }

  return stageOf;
}

function yearSortKey(year: string): number {
  const match = year.match(/(\d+)/);
  return match ? Number.parseInt(match[1]!, 10) : Number.MAX_SAFE_INTEGER;
}

export function sortCourseYears(years: Iterable<string>): string[] {
  return [...new Set([...years].filter(Boolean))].sort((left, right) => {
    const leftKey = yearSortKey(left);
    const rightKey = yearSortKey(right);
    if (leftKey !== rightKey) {
      return leftKey - rightKey;
    }

    return left.localeCompare(right, "es-AR");
  });
}

/** Layer index using only prerequisites inside `scope` (e.g. the same year band). */
export function assignCourseStagesWithinScope(
  titles: readonly DegreeRoadmapNodeTitle[],
  adjacency: DegreeRoadmapAdjacency,
  scope: ReadonlySet<DegreeRoadmapNodeTitle>,
): Map<DegreeRoadmapNodeTitle, number> {
  const stageOf = new Map<DegreeRoadmapNodeTitle, number>();
  const stages: DegreeRoadmapNodeTitle[][] = [];
  const placed = new Set<DegreeRoadmapNodeTitle>();

  while (placed.size < titles.length) {
    const pending = titles.filter((title) => !placed.has(title));
    const frontier = pending.filter((title) =>
      [...(adjacency.prerequisites.get(title) ?? [])]
        .filter((prerequisite) => scope.has(prerequisite))
        .every((prerequisite) => placed.has(prerequisite)),
    );

    const nextStage = frontier.length > 0 ? frontier : pending;
    stages.push(nextStage);
    for (const title of nextStage) {
      placed.add(title);
    }
  }

  for (const [stageIndex, stage] of stages.entries()) {
    for (const title of stage) {
      stageOf.set(title, stageIndex);
    }
  }

  return stageOf;
}

function averageNeighborIndex(
  title: DegreeRoadmapNodeTitle,
  neighbors: Iterable<DegreeRoadmapNodeTitle>,
  indexByTitle: ReadonlyMap<DegreeRoadmapNodeTitle, number>,
): number | undefined {
  const indices = [...neighbors]
    .map((neighbor) => indexByTitle.get(neighbor))
    .filter((index): index is number => index !== undefined);

  if (indices.length === 0) {
    return undefined;
  }

  return indices.reduce((sum, index) => sum + index, 0) / indices.length;
}

/** Reorder rows to align prerequisites above dependents and reduce edge crossings. */
export function orderCourseRowsByBarycenter(
  rows: DegreeRoadmapNodeTitle[][],
  adjacency: DegreeRoadmapAdjacency,
): void {
  if (rows.length === 0) {
    return;
  }

  rows[0] = [...rows[0]!].sort((left, right) => left.localeCompare(right, "es-AR"));
  let indexByTitle = new Map(rows[0]!.map((title, index) => [title, index]));

  for (let stage = 1; stage < rows.length; stage += 1) {
    const row = rows[stage];
    if (!row) {
      continue;
    }

    row.sort((left, right) => {
      const leftScore =
        averageNeighborIndex(left, adjacency.prerequisites.get(left) ?? [], indexByTitle) ??
        Number.POSITIVE_INFINITY;
      const rightScore =
        averageNeighborIndex(right, adjacency.prerequisites.get(right) ?? [], indexByTitle) ??
        Number.POSITIVE_INFINITY;

      return (
        leftScore - rightScore || left.localeCompare(right, "es-AR")
      );
    });

    indexByTitle = new Map(row.map((title, index) => [title, index]));
  }

  for (let stage = rows.length - 2; stage >= 0; stage -= 1) {
    const row = rows[stage];
    if (!row) {
      continue;
    }

    row.sort((left, right) => {
      const leftScore =
        averageNeighborIndex(left, adjacency.nextSteps.get(left) ?? [], indexByTitle) ??
        Number.POSITIVE_INFINITY;
      const rightScore =
        averageNeighborIndex(right, adjacency.nextSteps.get(right) ?? [], indexByTitle) ??
        Number.POSITIVE_INFINITY;

      return (
        leftScore - rightScore || left.localeCompare(right, "es-AR")
      );
    });

    indexByTitle = new Map(row.map((title, index) => [title, index]));
  }
}

/** Integer column per course so prerequisites stay vertically above dependents. */
export function assignCourseColumns(
  rows: DegreeRoadmapNodeTitle[][],
  adjacency: DegreeRoadmapAdjacency,
): Map<DegreeRoadmapNodeTitle, number> {
  const columnOf = new Map<DegreeRoadmapNodeTitle, number>();
  const firstRow = rows[0];
  if (!firstRow) {
    return columnOf;
  }

  firstRow.forEach((title, index) => columnOf.set(title, index));

  for (let stage = 1; stage < rows.length; stage += 1) {
    const row = rows[stage];
    if (!row) {
      continue;
    }

    const ranked = row
      .map((title) => {
        const prerequisites = [...(adjacency.prerequisites.get(title) ?? [])];
        const ideal =
          prerequisites.length === 0
            ? Number.POSITIVE_INFINITY
            : prerequisites.reduce(
                (sum, prerequisite) => sum + (columnOf.get(prerequisite) ?? 0),
                0,
              ) / prerequisites.length;

        return { title, ideal };
      })
      .sort(
        (left, right) =>
          left.ideal - right.ideal || left.title.localeCompare(right.title, "es-AR"),
      );

    let nextColumn = 0;
    for (const { title, ideal } of ranked) {
      const column =
        ideal === Number.POSITIVE_INFINITY
          ? nextColumn
          : Math.max(nextColumn, Math.round(ideal));
      columnOf.set(title, column);
      nextColumn = column + 1;
    }
  }

  return columnOf;
}

/** Columns align across years so prerequisite chains stay vertical. */
export function assignCourseColumnsByYear(
  titles: readonly DegreeRoadmapNodeTitle[],
  yearsByTitle: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
  adjacency: DegreeRoadmapAdjacency,
): Map<DegreeRoadmapNodeTitle, number> {
  const columnOf = new Map<DegreeRoadmapNodeTitle, number>();
  const groupedYears = [
    ...sortCourseYears(titles.map((title) => yearsByTitle.get(title) ?? "")),
    ...(titles.some((title) => !yearsByTitle.get(title)) ? [""] : []),
  ];

  for (const year of groupedYears) {
    const yearTitles = titles.filter((title) => (yearsByTitle.get(title) ?? "") === year);
    if (yearTitles.length === 0) {
      continue;
    }

    const ranked = yearTitles
      .map((title) => {
        const prerequisites = [...(adjacency.prerequisites.get(title) ?? [])];
        const ideal =
          prerequisites.length === 0
            ? Number.POSITIVE_INFINITY
            : prerequisites.reduce(
                (sum, prerequisite) => sum + (columnOf.get(prerequisite) ?? 0),
                0,
              ) / prerequisites.length;

        return { title, ideal };
      })
      .sort(
        (left, right) =>
          left.ideal - right.ideal || left.title.localeCompare(right.title, "es-AR"),
      );

    let nextColumn = 0;
    for (const { title, ideal } of ranked) {
      const column =
        ideal === Number.POSITIVE_INFINITY
          ? nextColumn
          : Math.max(nextColumn, Math.round(ideal));
      columnOf.set(title, column);
      nextColumn = column + 1;
    }
  }

  return columnOf;
}

type CourseDisplayRow = CuratedCourseDisplayRow;

function appendWrappedDisplayRows(
  displayRows: CourseDisplayRow[],
  options: {
    year: string;
    withinYearStage: number;
    stage: number;
    titles: DegreeRoadmapNodeTitle[];
    columnOf: Map<DegreeRoadmapNodeTitle, number>;
    maxCoursesPerRow?: number;
  },
): void {
  const maxCoursesPerRow = options.maxCoursesPerRow ?? MAX_COURSES_PER_ROW;
  const sorted = [...options.titles].sort(
    (left, right) =>
      (options.columnOf.get(left) ?? 0) - (options.columnOf.get(right) ?? 0) ||
      left.localeCompare(right, "es-AR"),
  );

  for (let index = 0; index < sorted.length; index += maxCoursesPerRow) {
    displayRows.push({
      year: options.year,
      withinYearStage: options.withinYearStage,
      stage: options.stage,
      titles: sorted.slice(index, index + maxCoursesPerRow),
    });
  }
}

function buildCourseDisplayRows(
  rows: DegreeRoadmapNodeTitle[][],
  columnOf: Map<DegreeRoadmapNodeTitle, number>,
): CourseDisplayRow[] {
  const displayRows: CourseDisplayRow[] = [];

  for (const [stageIndex, row] of rows.entries()) {
    if (!row || row.length === 0) {
      continue;
    }

    appendWrappedDisplayRows(displayRows, {
      year: "",
      withinYearStage: stageIndex,
      stage: stageIndex,
      titles: row,
      columnOf,
    });
  }

  return displayRows;
}

function buildCourseDisplayRowsByYear(
  titles: readonly DegreeRoadmapNodeTitle[],
  yearsByTitle: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
  globalStageOf: Map<DegreeRoadmapNodeTitle, number>,
  columnOf: Map<DegreeRoadmapNodeTitle, number>,
  adjacency: DegreeRoadmapAdjacency,
  maxCoursesPerRowByYear?: ReadonlyMap<string, number>,
): CourseDisplayRow[] {
  const displayRows: CourseDisplayRow[] = [];
  const groupedYears = [
    ...sortCourseYears(titles.map((title) => yearsByTitle.get(title) ?? "")),
    ...(titles.some((title) => !yearsByTitle.get(title)) ? [""] : []),
  ];

  for (const year of groupedYears) {
    const yearTitles = titles.filter((title) => (yearsByTitle.get(title) ?? "") === year);
    if (yearTitles.length === 0) {
      continue;
    }

    const yearScope = new Set(yearTitles);
    const withinYearStageOf = assignCourseStagesWithinScope(
      yearTitles,
      adjacency,
      yearScope,
    );
    const maxWithinYearStage = Math.max(...withinYearStageOf.values());
    const rows: DegreeRoadmapNodeTitle[][] = Array.from(
      { length: maxWithinYearStage + 1 },
      () => [],
    );

    for (const title of yearTitles) {
      rows[withinYearStageOf.get(title) ?? 0]!.push(title);
    }

    orderCourseRowsByBarycenter(rows, adjacency);

    for (const [withinYearStage, row] of rows.entries()) {
      if (!row || row.length === 0) {
        continue;
      }

      appendWrappedDisplayRows(displayRows, {
        year,
        withinYearStage,
        stage: Math.max(...row.map((title) => globalStageOf.get(title) ?? 0)),
        titles: row,
        columnOf,
        maxCoursesPerRow: maxCoursesPerRowByYear?.get(year),
      });
    }
  }

  return displayRows;
}

/** Keep curated shifts from placing two courses in the same grid column on one row. */
export function resolveCourseRowColumnCollisions(
  titles: readonly DegreeRoadmapNodeTitle[],
  columnOf: Map<DegreeRoadmapNodeTitle, number>,
): void {
  const sorted = [...titles].sort((left, right) => {
    const leftColumn = columnOf.get(left) ?? 0;
    const rightColumn = columnOf.get(right) ?? 0;
    return leftColumn - rightColumn || left.localeCompare(right, "es-AR");
  });

  let nextColumn = Number.NEGATIVE_INFINITY;
  for (const title of sorted) {
    const desired = columnOf.get(title) ?? 0;
    const column = Math.max(desired, nextColumn + 1);
    columnOf.set(title, column);
    nextColumn = column;
  }
}

function placementsOverlap(
  left: RoadmapPlacement,
  right: RoadmapPlacement,
  padding = 12,
): boolean {
  return (
    left.x < right.x + right.width + padding &&
    left.x + left.width + padding > right.x &&
    left.y < right.y + right.height + padding &&
    left.y + left.height + padding > right.y
  );
}

/** Nudge overlapping nodes apart after correlativa enforcement. */
export function resolvePlacementOverlaps(
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
  stride: number,
): void {
  let changed = true;

  while (changed) {
    changed = false;
    const nodes = [...placements.values()].sort(
      (left, right) =>
        left.y - right.y ||
        left.x - right.x ||
        left.title.localeCompare(right.title, "es-AR"),
    );

    for (let index = 0; index < nodes.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
        const upper = nodes[index]!;
        const lower = nodes[otherIndex]!;

        if (!placementsOverlap(upper, lower)) {
          continue;
        }

        if (Math.abs(upper.y - lower.y) <= COURSE_SAME_BAND_Y_THRESHOLD) {
          const mover = upper.x <= lower.x ? lower : upper;
          mover.x += stride;
        } else {
          lower.y = Math.max(
            lower.y,
            upper.y + upper.height + COURSE_SUBROW_GAP,
          );
        }

        changed = true;
      }
    }
  }
}

/** Every correlativa sits above the courses that require it. */
export function enforceCorrelativaVerticalOrder(
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
  adjacency: DegreeRoadmapAdjacency,
): void {
  const minGap = COURSE_SUBROW_GAP;
  let changed = true;

  while (changed) {
    changed = false;

    for (const [target, prerequisites] of adjacency.prerequisites) {
      const targetPlacement = placements.get(target);
      if (!targetPlacement) {
        continue;
      }

      for (const prerequisite of prerequisites) {
        const prerequisitePlacement = placements.get(prerequisite);
        if (!prerequisitePlacement) {
          continue;
        }

        const minimumY = prerequisitePlacement.y + prerequisitePlacement.height + minGap;
        if (targetPlacement.y < minimumY) {
          targetPlacement.y = minimumY;
          changed = true;
        }
      }
    }
  }
}

function computeCourseYearBands(
  yearsByTitle: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
  placements: Map<DegreeRoadmapNodeTitle, RoadmapPlacement>,
): CourseYearBand[] {
  const bandExtents = new Map<string, { minY: number; maxY: number }>();

  for (const [title, placement] of placements) {
    const year = yearsByTitle.get(title);
    if (!year) {
      continue;
    }

    const current = bandExtents.get(year) ?? {
      minY: placement.y,
      maxY: placement.y + placement.height,
    };
    current.minY = Math.min(current.minY, placement.y);
    current.maxY = Math.max(current.maxY, placement.y + placement.height);
    bandExtents.set(year, current);
  }

  return sortCourseYears(bandExtents.keys()).map((year) => {
    const extent = bandExtents.get(year)!;
    return {
      year,
      y: extent.minY,
      height: extent.maxY - extent.minY,
    };
  });
}

function shouldGroupCoursesByYear(
  titles: readonly DegreeRoadmapNodeTitle[],
  yearsByTitle?: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
): yearsByTitle is ReadonlyMap<DegreeRoadmapNodeTitle, string> {
  return (
    yearsByTitle !== undefined &&
    yearsByTitle.size > 0 &&
    titles.some((title) => Boolean(yearsByTitle.get(title)))
  );
}

/**
 * Staged correlativas DAG: entry courses share the top row in parallel; each layer
 * is one horizontal row; edges follow prerequisite links directly.
 */
export function buildStagedCourseRoadmapLayout(
  roadmap: DegreeRoadmap,
  adjacency: DegreeRoadmapAdjacency,
  yearsByTitle?: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
  curatedLayoutMetrics?: CuratedCourseLayoutMetrics | null,
  courseLayoutCuration?: CourseRoadmapCuration | null,
): RoadmapLayout {
  const titles = degreeRoadmapNodeTitles(roadmap);
  if (titles.length === 0) {
    return {
      placements: new Map(),
      attached: new Map(),
      trunk: [],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  }

  const stageOf = assignCourseStages(titles, adjacency);
  const maxStage = Math.max(...stageOf.values());
  const rows: DegreeRoadmapNodeTitle[][] = Array.from({ length: maxStage + 1 }, () => []);

  for (const title of titles) {
    rows[stageOf.get(title) ?? 0]!.push(title);
  }

  orderCourseRowsByBarycenter(rows, adjacency);
  const groupByYear = shouldGroupCoursesByYear(titles, yearsByTitle);
  const courseCuration = courseLayoutCuration ?? null;
  let slugToTitle: Map<CurriculumPageSlug, DegreeRoadmapNodeTitle> | undefined;
  let useCuratedGrid =
    groupByYear &&
    yearsByTitle &&
    courseCuration &&
    hasCuratedCourseGrid(courseCuration);

  let displayRows: CourseDisplayRow[] = [];
  let columnOf = new Map<DegreeRoadmapNodeTitle, number>();

  if (useCuratedGrid && courseCuration) {
    slugToTitle = new Map(
      roadmap.concepts.map((concept) => [concept.slug, concept.title]),
    );

    ({ displayRows, columnOf } = buildCuratedCourseGrid(
      courseCuration,
      titles,
      yearsByTitle!,
      stageOf,
      sortCourseYears,
      slugToTitle,
    ));

    appendUnplacedCuratedCourses(
      titles,
      columnOf,
      displayRows,
      yearsByTitle!,
      stageOf,
      sortCourseYears,
    );

    if (displayRows.length === 0) {
      useCuratedGrid = false;
    }
  }

  if (!useCuratedGrid) {
    columnOf = groupByYear
      ? assignCourseColumnsByYear(titles, yearsByTitle!, adjacency)
      : assignCourseColumns(rows, adjacency);

    displayRows = groupByYear
      ? buildCourseDisplayRowsByYear(
          titles,
          yearsByTitle!,
          stageOf,
          columnOf,
          adjacency,
        )
      : buildCourseDisplayRows(rows, columnOf);

    for (const row of displayRows) {
      resolveCourseRowColumnCollisions(row.titles, columnOf);
    }
  }

  const placements = new Map<DegreeRoadmapNodeTitle, RoadmapPlacement>();
  const curatedMetrics =
    useCuratedGrid && curatedLayoutMetrics
      ? resolveCuratedGridMetrics(curatedLayoutMetrics)
      : null;
  const stride = curatedMetrics?.stride ?? COURSE_NODE_WIDTH + COURSE_COLUMN_GAP;
  const nodeWidth = curatedMetrics?.nodeWidth ?? COURSE_NODE_WIDTH;
  const nodeHeight = curatedMetrics?.nodeHeight ?? COURSE_NODE_HEIGHT;
  const columns = [...columnOf.values()];
  const graphCenter =
    columns.length === 0 ? 0 : (Math.min(...columns) + Math.max(...columns)) / 2;
  let cursorY = 0;

  for (const [rowIndex, row] of displayRows.entries()) {
    if (rowIndex > 0) {
      const previousRow = displayRows[rowIndex - 1]!;

      if (useCuratedGrid && curatedLayoutMetrics) {
        cursorY += resolveCuratedRowStride(curatedLayoutMetrics, row, previousRow, {
          nodeHeight,
          subrowGap: COURSE_SUBROW_GAP,
        });
      } else {
        let gap = COURSE_STAGE_GAP;

        if (row.year !== previousRow.year) {
          gap = COURSE_YEAR_GAP;
        } else if (row.withinYearStage === previousRow.withinYearStage) {
          gap = COURSE_SUBROW_GAP;
        }

        cursorY += nodeHeight + gap;
      }
    }

    for (const title of row.titles) {
      const column = columnOf.get(title) ?? 0;
      const centerX = (column - graphCenter) * stride;
      placements.set(title, {
        title,
        role: "spine",
        stage: stageOf.get(title) ?? row.stage,
        x: centerX - nodeWidth / 2,
        y: cursorY,
        width: nodeWidth,
        height: nodeHeight,
      });
    }
  }

  if (!useCuratedGrid) {
    enforceCorrelativaVerticalOrder(placements, adjacency);
    resolvePlacementOverlaps(placements, stride);
  }

  const positioned = [...placements.values()];
  const courseYearBands =
    groupByYear && yearsByTitle
      ? computeCourseYearBands(yearsByTitle, placements)
      : undefined;
  const graphMidX =
    positioned.length === 0
      ? 0
      : (Math.min(...positioned.map((node) => node.x)) +
          Math.max(...positioned.map((node) => node.x + node.width))) /
        2;
  const anchorX = graphMidX - ANCHOR_NODE_WIDTH / 2;
  const maxContentY =
    positioned.length === 0
      ? 0
      : Math.max(...positioned.map((placement) => placement.y + placement.height));
  const minNodeX =
    positioned.length === 0 ? 0 : Math.min(...positioned.map((node) => node.x));
  const maxNodeX =
    positioned.length === 0 ? 0 : Math.max(...positioned.map((node) => node.x + node.width));
  const labelGutter = courseYearBands ? COURSE_YEAR_LABEL_GUTTER : 0;

  let courseGridCells;
  if (
    useCuratedGrid &&
    courseCuration &&
    curatedLayoutMetrics &&
    slugToTitle
  ) {
    courseGridCells = buildCuratedGridCells({
      curation: courseCuration,
      displayRows,
      placements,
      graphCenter,
      stride,
      nodeWidth,
      nodeHeight,
      slugToTitle,
    });
  }

  return {
    placements,
    courseYearBands,
    courseGridCells,
    attached: new Map(),
    trunk: [],
    start: { x: anchorX, y: 0 },
    end: { x: anchorX, y: maxContentY },
    bounds: {
      minX: minNodeX - labelGutter,
      maxX: maxNodeX,
      minY: 0,
      maxY: maxContentY,
    },
  };
}

export function buildCourseRoadmapLayout(
  roadmap: DegreeRoadmap,
  adjacency: DegreeRoadmapAdjacency,
  yearsByTitle?: ReadonlyMap<DegreeRoadmapNodeTitle, string>,
  curatedLayoutMetrics?: CuratedCourseLayoutMetrics | null,
  courseLayoutCuration?: CourseRoadmapCuration | null,
): RoadmapLayout {
  return buildStagedCourseRoadmapLayout(
    roadmap,
    adjacency,
    yearsByTitle,
    curatedLayoutMetrics,
    courseLayoutCuration,
  );
}

/** When width limits zoom, scale layout height so fit-to-view fills the panel vertically. */
export function verticalStretchToFillViewport(
  bounds: RoadmapBounds,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
): number {
  if (viewportWidth <= padding * 2 || viewportHeight <= padding * 2) {
    return 1;
  }

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const zoomX = (viewportWidth - padding * 2) / contentWidth;
  const zoomY = (viewportHeight - padding * 2) / contentHeight;
  if (zoomX >= zoomY) {
    return 1;
  }

  const desiredHeight = (viewportHeight - padding * 2) / zoomX;
  return Math.max(1, desiredHeight / contentHeight);
}

export function stretchCourseRoadmapLayoutVertically(
  layout: RoadmapLayout,
  yearsByTitle: ReadonlyMap<DegreeRoadmapNodeTitle, string> | undefined,
  stretch: number,
): RoadmapLayout {
  if (stretch <= 1.001) {
    return layout;
  }

  const anchorY = layout.bounds.minY;
  const placements = new Map<DegreeRoadmapNodeTitle, RoadmapPlacement>();
  for (const [title, placement] of layout.placements) {
    placements.set(title, {
      ...placement,
      y: anchorY + (placement.y - anchorY) * stretch,
    });
  }

  const courseYearBands =
    yearsByTitle && layout.courseYearBands
      ? computeCourseYearBands(yearsByTitle, placements)
      : layout.courseYearBands;

  const positioned = [...placements.values()];
  const maxContentY =
    positioned.length === 0
      ? layout.bounds.maxY
      : Math.max(...positioned.map((placement) => placement.y + placement.height));

  const courseGridCells = layout.courseGridCells?.map((cell) => {
    const y = anchorY + (cell.y - anchorY) * stretch;
    const centerY = anchorY + (cell.centerY - anchorY) * stretch;
    return { ...cell, y, centerY };
  });

  return {
    ...layout,
    placements,
    courseYearBands,
    courseGridCells,
    end: { ...layout.end, y: maxContentY },
    bounds: {
      ...layout.bounds,
      maxY: maxContentY,
    },
  };
}
