import type { DegreeRoadmap } from "@pps/core";

import { topologicalStages, type RoadmapAdjacency } from "./adjacency";
import {
  ANCHOR_GAP,
  ANCHOR_NODE_HEIGHT,
  ANCHOR_NODE_WIDTH,
  SPINE_NODE_HEIGHT,
  SPINE_NODE_WIDTH,
} from "./constants";
import {
  buildCuratedCourseGrid,
  getCourseRoadmapCuration,
  hasCuratedCourseGrid,
  type CuratedCourseDisplayRow,
} from "./course-curation";
import {
  resolveCuratedGridMetrics,
  resolveCuratedRowStride,
  type CuratedCourseLayoutMetrics,
} from "./course-layout-metrics";
import type { CourseYearBand, RoadmapLayout, RoadmapPlacement } from "./layout";

/** Horizontal gap between course nodes in the same row. */
const COURSE_COLUMN_GAP = 140;
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
  titles: string[],
  adjacency: RoadmapAdjacency,
): Map<string, number> {
  const stageOf = new Map<string, number>();
  const order = topologicalStages(titles, adjacency).flat();

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
  titles: string[],
  adjacency: RoadmapAdjacency,
  scope: ReadonlySet<string>,
): Map<string, number> {
  const stageOf = new Map<string, number>();
  const stages: string[][] = [];
  const placed = new Set<string>();

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
  title: string,
  neighbors: Iterable<string>,
  indexByTitle: ReadonlyMap<string, number>,
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
  rows: string[][],
  adjacency: RoadmapAdjacency,
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
  rows: string[][],
  adjacency: RoadmapAdjacency,
): Map<string, number> {
  const columnOf = new Map<string, number>();
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
  titles: string[],
  yearsByTitle: ReadonlyMap<string, string>,
  adjacency: RoadmapAdjacency,
): Map<string, number> {
  const columnOf = new Map<string, number>();
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
    titles: string[];
    columnOf: Map<string, number>;
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
  rows: string[][],
  columnOf: Map<string, number>,
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
  titles: string[],
  yearsByTitle: ReadonlyMap<string, string>,
  globalStageOf: Map<string, number>,
  columnOf: Map<string, number>,
  adjacency: RoadmapAdjacency,
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
    const rows: string[][] = Array.from({ length: maxWithinYearStage + 1 }, () => []);

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
  titles: string[],
  columnOf: Map<string, number>,
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
  placements: Map<string, RoadmapPlacement>,
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
  placements: Map<string, RoadmapPlacement>,
  adjacency: RoadmapAdjacency,
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
  yearsByTitle: ReadonlyMap<string, string>,
  placements: Map<string, RoadmapPlacement>,
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
  titles: string[],
  yearsByTitle?: ReadonlyMap<string, string>,
): yearsByTitle is ReadonlyMap<string, string> {
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
  adjacency: RoadmapAdjacency,
  yearsByTitle?: ReadonlyMap<string, string>,
  curatedLayoutMetrics?: CuratedCourseLayoutMetrics | null,
): RoadmapLayout {
  const titles = roadmap.concepts.map((concept) => concept.title);
  if (titles.length === 0) {
    return {
      placements: new Map(),
      attached: new Map(),
      parallelLanes: [],
      trunk: [],
      lateJoins: [],
      trunkForks: [],
      capstoneByAfter: new Map(),
      start: { x: -ANCHOR_NODE_WIDTH / 2, y: 0 },
      end: { x: -ANCHOR_NODE_WIDTH / 2, y: ANCHOR_NODE_HEIGHT + ANCHOR_GAP },
      bounds: {
        minX: -ANCHOR_NODE_WIDTH / 2,
        maxX: ANCHOR_NODE_WIDTH / 2,
        minY: 0,
        maxY: ANCHOR_NODE_HEIGHT * 2 + ANCHOR_GAP,
      },
    };
  }

  const stageOf = assignCourseStages(titles, adjacency);
  const maxStage = Math.max(...stageOf.values());
  const rows: string[][] = Array.from({ length: maxStage + 1 }, () => []);

  for (const title of titles) {
    rows[stageOf.get(title) ?? 0]!.push(title);
  }

  orderCourseRowsByBarycenter(rows, adjacency);
  const groupByYear = shouldGroupCoursesByYear(titles, yearsByTitle);
  const courseCuration = getCourseRoadmapCuration(roadmap.degreeSlug);
  let useCuratedGrid =
    groupByYear &&
    yearsByTitle &&
    courseCuration &&
    hasCuratedCourseGrid(courseCuration);

  let displayRows: CourseDisplayRow[];
  let columnOf: Map<string, number>;

  if (useCuratedGrid) {
    const slugToTitle = new Map(
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

  const placements = new Map<string, RoadmapPlacement>();
  const curatedMetrics =
    useCuratedGrid && curatedLayoutMetrics
      ? resolveCuratedGridMetrics(curatedLayoutMetrics)
      : null;
  const stride = curatedMetrics?.stride ?? SPINE_NODE_WIDTH + COURSE_COLUMN_GAP;
  const nodeWidth = curatedMetrics?.nodeWidth ?? SPINE_NODE_WIDTH;
  const columns = [...columnOf.values()];
  const graphCenter =
    columns.length === 0 ? 0 : (Math.min(...columns) + Math.max(...columns)) / 2;
  let cursorY = ANCHOR_NODE_HEIGHT + ANCHOR_GAP;

  for (const [rowIndex, row] of displayRows.entries()) {
    if (rowIndex > 0) {
      const previousRow = displayRows[rowIndex - 1]!;

      if (useCuratedGrid && curatedLayoutMetrics) {
        cursorY += resolveCuratedRowStride(curatedLayoutMetrics, row, previousRow, {
          nodeHeight: SPINE_NODE_HEIGHT,
          subrowGap: COURSE_SUBROW_GAP,
        });
      } else {
        let gap = COURSE_STAGE_GAP;

        if (row.year !== previousRow.year) {
          gap = COURSE_YEAR_GAP;
        } else if (row.withinYearStage === previousRow.withinYearStage) {
          gap = COURSE_SUBROW_GAP;
        }

        cursorY += SPINE_NODE_HEIGHT + gap;
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
        height: SPINE_NODE_HEIGHT,
      });
    }
  }

  if (!useCuratedGrid) {
    enforceCorrelativaVerticalOrder(placements, adjacency);
    resolvePlacementOverlaps(placements, stride);
  }

  cursorY = Math.max(
    cursorY,
    ...[...placements.values()].map((placement) => placement.y + placement.height),
  );
  cursorY += ANCHOR_GAP;

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
  const end = { x: anchorX, y: cursorY };
  const minNodeX =
    positioned.length === 0
      ? anchorX
      : Math.min(anchorX, ...positioned.map((node) => node.x));
  const labelGutter = courseYearBands ? COURSE_YEAR_LABEL_GUTTER : 0;

  return {
    placements,
    courseYearBands,
    attached: new Map(),
    parallelLanes: [],
    trunk: [],
    lateJoins: [],
    trunkForks: [],
    capstoneByAfter: new Map(),
    start: { x: anchorX, y: 0 },
    end,
    bounds: {
      minX: minNodeX - labelGutter,
      maxX: Math.max(anchorX + ANCHOR_NODE_WIDTH, ...positioned.map((node) => node.x + node.width)),
      minY: 0,
      maxY: end.y + ANCHOR_NODE_HEIGHT,
    },
  };
}

export function buildCourseRoadmapLayout(
  roadmap: DegreeRoadmap,
  adjacency: RoadmapAdjacency,
  yearsByTitle?: ReadonlyMap<string, string>,
  curatedLayoutMetrics?: CuratedCourseLayoutMetrics | null,
): RoadmapLayout {
  return buildStagedCourseRoadmapLayout(
    roadmap,
    adjacency,
    yearsByTitle,
    curatedLayoutMetrics,
  );
}
