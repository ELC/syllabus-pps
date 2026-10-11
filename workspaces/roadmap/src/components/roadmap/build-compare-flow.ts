import {
  isTrayectoNoEstructurado,
  yearIndexFromDisplayLabel,
  type CourseRoadmap,
  type CourseRoadmapCourse,
} from "@pps/core";
import type { Node } from "@xyflow/react";

/** Compare view course cards (layout + CSS `--roadmap-course-node-*`). */
export const COMPARE_COURSE_NODE_WIDTH = 284;
export const COMPARE_COURSE_NODE_HEIGHT = 108;
export const COMPARE_MAX_ROWS_PER_YEAR = 2;

export const COMPARE_SIDE_INNER_COL_GAP = 56;
export const COMPARE_SIDE_ROW_GAP = 38;
/** Horizontal inset inside solo-A / solo-B column backgrounds. */
export const COMPARE_SIDE_SECTION_GUTTER = 32;
export const COMPARE_CENTER_INNER_COLS = 2;
export const COMPARE_CENTER_INNER_COL_GAP = 72;
export const COMPARE_CENTER_ROW_GAP = 56;
/** Horizontal inset around the shared grid inside the middle band. */
export const COMPARE_CENTER_SECTION_GUTTER = 80;
/** Vertical inset between the middle band edge and shared course cards. */
export const COMPARE_CENTER_SECTION_INSET_TOP = 28;
export const COMPARE_CENTER_SECTION_INSET_BOTTOM = 28;

export const COMPARE_COLUMN_GAP = 184;

export function compareInnerColsForItemCount(
  itemCount: number,
  maxRows = COMPARE_MAX_ROWS_PER_YEAR,
): number {
  if (itemCount <= 0) {
    return 2;
  }
  return Math.max(2, Math.ceil(itemCount / maxRows));
}

export function compareGridSectionWidth(innerCols: number, innerColGap: number): number {
  return (
    innerCols * COMPARE_COURSE_NODE_WIDTH + Math.max(0, innerCols - 1) * innerColGap
  );
}

/** Minimum side width (2 columns) for fallbacks and tests. */
export const COMPARE_SIDE_SECTION_WIDTH =
  compareGridSectionWidth(2, COMPARE_SIDE_INNER_COL_GAP) + 2 * COMPARE_SIDE_SECTION_GUTTER;
export const COMPARE_CENTER_SECTION_WIDTH =
  compareGridSectionWidth(2, COMPARE_CENTER_INNER_COL_GAP) + 2 * COMPARE_CENTER_SECTION_GUTTER;
/** @deprecated Use {@link compareGridSectionWidth}. */
export const COMPARE_INNER_COLS = 2;
/** @deprecated Use {@link COMPARE_SIDE_INNER_COL_GAP}. */
export const COMPARE_INNER_COL_GAP = COMPARE_SIDE_INNER_COL_GAP;
/** @deprecated Use {@link COMPARE_SIDE_SECTION_WIDTH}. */
export const COMPARE_SECTION_WIDTH = COMPARE_SIDE_SECTION_WIDTH;
/** @deprecated Use {@link COMPARE_SIDE_SECTION_WIDTH}. */
export const COMPARE_COLUMN_WIDTH = COMPARE_SIDE_SECTION_WIDTH;

export interface CompareLayoutMetrics {
  sideSectionWidth: number;
  sideInnerCols: number;
  centerSectionWidth: number;
  centerInnerCols: number;
  centerGridWidth: number;
}
/** Reserved vertical space for compare column headers (single-line titles). */
export const COMPARE_HEADER_HEIGHT = 96;
/** Gap between header block and course/year content. */
export const COMPARE_HEADER_SECTION_GAP = 8;
/** @deprecated Side columns use {@link COMPARE_SIDE_ROW_GAP}. */
export const COMPARE_ROW_GAP = COMPARE_SIDE_ROW_GAP;
export const COMPARE_TOP_GUTTER = COMPARE_HEADER_SECTION_GAP;
export const COMPARE_CENTER_HEADER_LABEL = "En común";
export const COMPARE_YEAR_BAND_HEIGHT = 88;
export const COMPARE_YEAR_SECTION_GAP = 28;
export const COMPARE_YEAR_AFTER_GROUP_GAP = 22;

function yearSortIndex(label: string): number {
  return yearIndexFromDisplayLabel(label) ?? 99;
}

export function compareCoursesByYearColor<T>(
  courses: T[],
  yearFor: (course: T) => string,
  titleFor: (course: T) => string,
): T[] {
  return [...courses].sort((left, right) => {
    const yearDelta = yearSortIndex(yearFor(left)) - yearSortIndex(yearFor(right));
    if (yearDelta !== 0) {
      return yearDelta;
    }
    return titleFor(left).localeCompare(titleFor(right), "es-AR");
  });
}

export interface CompareCoursePartition {
  onlyLeft: CourseRoadmapCourse[];
  onlyRight: CourseRoadmapCourse[];
  shared: Array<{
    slug: string;
    title: string;
    leftYear: string;
    rightYear: string;
    leftTrayecto: CourseRoadmapCourse["trayecto"];
    rightTrayecto: CourseRoadmapCourse["trayecto"];
  }>;
}

function compareIncludesCourse(course: CourseRoadmapCourse): boolean {
  return (
    !isTrayectoNoEstructurado(course.trayecto) && course.year.trim().length > 0
  );
}

export function partitionCompareCourses(
  left: CourseRoadmap,
  right: CourseRoadmap,
): CompareCoursePartition {
  const leftCourses = left.courses.filter(compareIncludesCourse);
  const rightCourses = right.courses.filter(compareIncludesCourse);
  const rightBySlug = new Map(rightCourses.map((course) => [course.slug, course]));
  const leftBySlug = new Map(leftCourses.map((course) => [course.slug, course]));
  const rightSlugs = new Set(rightCourses.map((course) => course.slug));

  const onlyLeft = compareCoursesByYearColor(
    leftCourses.filter((course) => !rightSlugs.has(course.slug)),
    (course) => course.year,
    (course) => course.title,
  );

  const onlyRight = compareCoursesByYearColor(
    rightCourses.filter((course) => !leftBySlug.has(course.slug)),
    (course) => course.year,
    (course) => course.title,
  );

  const shared = compareCoursesByYearColor(
    leftCourses
      .filter((course) => rightBySlug.has(course.slug))
      .map((course) => {
        const other = rightBySlug.get(course.slug)!;
        return {
          slug: course.slug,
          title: course.title,
          leftYear: course.year,
          rightYear: other.year,
          leftTrayecto: course.trayecto,
          rightTrayecto: other.trayecto,
        };
      }),
    (course) => course.leftYear,
    (course) => course.title,
  );

  return { onlyLeft, onlyRight, shared };
}

export interface RoadmapCompareHeaderNodeData extends Record<string, unknown> {
  label: string;
  sectionWidth: number;
}

export interface RoadmapCompareCourseNodeData extends Record<string, unknown> {
  label: string;
  column: "left" | "center" | "right";
  year?: string;
  yearTooltip?: string;
  trayecto?: CourseRoadmapCourse["trayecto"];
}

export interface RoadmapCompareColumnBgNodeData extends Record<string, unknown> {
  column: "left" | "center" | "right";
  height: number;
  sectionWidth: number;
}

export interface RoadmapCompareYearBandNodeData extends Record<string, unknown> {
  label: string;
  showSeparator: boolean;
  sectionWidth: number;
}

export interface CompareColumnCourseEntry {
  id: string;
  label: string;
  year?: string;
  yearTooltip?: string;
  trayecto?: CourseRoadmapCourse["trayecto"];
  groupYear?: string;
}

export function groupCompareEntriesByYear<T>(
  entries: T[],
  yearFor: (entry: T) => string,
): Array<{ year: string; items: T[] }> {
  const byYear = new Map<string, T[]>();
  for (const entry of entries) {
    const year = yearFor(entry).trim() || "Sin año";
    const bucket = byYear.get(year) ?? [];
    bucket.push(entry);
    byYear.set(year, bucket);
  }

  return [...byYear.entries()]
    .sort(([leftYear], [rightYear]) => yearSortIndex(leftYear) - yearSortIndex(rightYear))
    .map(([year, items]) => ({
      year,
      items: [...items].sort((left, right) => {
        const leftLabel = (left as { label?: string }).label ?? "";
        const rightLabel = (right as { label?: string }).label ?? "";
        return leftLabel.localeCompare(rightLabel, "es-AR");
      }),
    }));
}

export function compareSectionWidthForColumn(
  column: "left" | "center" | "right",
  metrics?: CompareLayoutMetrics,
): number {
  if (!metrics) {
    if (column === "center") {
      return COMPARE_CENTER_SECTION_WIDTH;
    }
    return COMPARE_SIDE_SECTION_WIDTH;
  }
  if (column === "center") {
    return metrics.centerSectionWidth;
  }
  return metrics.sideSectionWidth;
}

/** Total horizontal span of the three compare columns. */
export function compareCanvasContentWidth(metrics: CompareLayoutMetrics): number {
  return columnOriginX("right", metrics) + metrics.sideSectionWidth;
}

function columnOriginX(column: "left" | "center" | "right", metrics: CompareLayoutMetrics): number {
  const centerX = metrics.sideSectionWidth + COMPARE_COLUMN_GAP;
  if (column === "left") {
    return 0;
  }
  if (column === "center") {
    return centerX;
  }
  return centerX + metrics.centerSectionWidth + COMPARE_COLUMN_GAP;
}

function gridRowCount(itemCount: number, innerCols: number): number {
  if (itemCount <= 0) {
    return 0;
  }
  return Math.ceil(itemCount / innerCols);
}

function yearGroupGridHeight(
  itemCount: number,
  innerCols: number,
  rowGap: number,
): number {
  const rows = gridRowCount(itemCount, innerCols);
  if (rows <= 0) {
    return 0;
  }
  return rows * COMPARE_COURSE_NODE_HEIGHT + (rows - 1) * rowGap;
}

function slugifyCompareId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortCompareColumnEntries(entries: CompareColumnCourseEntry[]): CompareColumnCourseEntry[] {
  return compareCoursesByYearColor(
    entries,
    (entry) => entry.groupYear ?? entry.year ?? "Sin año",
    (entry) => entry.label,
  );
}

function pushCompareCourseNodes(
  nodes: Node[],
  column: "left" | "center" | "right",
  sectionX: number,
  gridTop: number,
  entries: CompareColumnCourseEntry[],
  innerCols: number,
  innerColGap: number,
  rowGap: number,
): void {
  entries.forEach((entry, index) => {
    const col = index % innerCols;
    const row = Math.floor(index / innerCols);
    const x = sectionX + col * (COMPARE_COURSE_NODE_WIDTH + innerColGap);
    const courseY = gridTop + row * (COMPARE_COURSE_NODE_HEIGHT + rowGap);
    nodes.push({
      id: entry.id,
      type: "roadmapCompareCourse",
      position: { x, y: courseY },
      data: {
        label: entry.label,
        column,
        year: entry.year,
        yearTooltip: entry.yearTooltip,
        trayecto: entry.trayecto,
      } satisfies RoadmapCompareCourseNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: column === "center" && entry.yearTooltip ? 4 : 2,
    });
  });
}

function layoutCompareCenterColumn(
  entries: CompareColumnCourseEntry[],
  contentTop: number,
  metrics: CompareLayoutMetrics,
): { nodes: Node[]; bodyHeight: number } {
  const column = "center" as const;
  const sectionX = columnOriginX(column, metrics);
  const sorted = sortCompareColumnEntries(entries);
  const nodes: Node[] = [];
  const gridTop = contentTop + COMPARE_CENTER_SECTION_INSET_TOP;
  const gridOffsetX = (metrics.centerSectionWidth - metrics.centerGridWidth) / 2;

  pushCompareCourseNodes(
    nodes,
    column,
    sectionX + gridOffsetX,
    gridTop,
    sorted,
    metrics.centerInnerCols,
    COMPARE_CENTER_INNER_COL_GAP,
    COMPARE_CENTER_ROW_GAP,
  );

  const gridHeight = yearGroupGridHeight(
    sorted.length,
    metrics.centerInnerCols,
    COMPARE_CENTER_ROW_GAP,
  );
  const bodyHeight =
    gridHeight + COMPARE_CENTER_SECTION_INSET_TOP + COMPARE_CENTER_SECTION_INSET_BOTTOM;

  return { nodes, bodyHeight: Math.max(bodyHeight, 0) };
}

function mergedSideYears(
  leftEntries: CompareColumnCourseEntry[],
  rightEntries: CompareColumnCourseEntry[],
): string[] {
  const years = new Set<string>();
  for (const entry of leftEntries) {
    years.add((entry.groupYear ?? entry.year ?? "Sin año").trim() || "Sin año");
  }
  for (const entry of rightEntries) {
    years.add((entry.groupYear ?? entry.year ?? "Sin año").trim() || "Sin año");
  }
  return [...years].sort((left, right) => yearSortIndex(left) - yearSortIndex(right));
}

function entriesForYear(
  entries: CompareColumnCourseEntry[],
  year: string,
): CompareColumnCourseEntry[] {
  return entries.filter((entry) => {
    const entryYear = (entry.groupYear ?? entry.year ?? "Sin año").trim() || "Sin año";
    return entryYear === year;
  });
}

function computeCompareLayoutMetrics(
  leftEntries: CompareColumnCourseEntry[],
  rightEntries: CompareColumnCourseEntry[],
  centerEntries: CompareColumnCourseEntry[],
): CompareLayoutMetrics {
  const years = mergedSideYears(leftEntries, rightEntries);
  let sideInnerCols = 2;
  for (const year of years) {
    const count = Math.max(
      entriesForYear(leftEntries, year).length,
      entriesForYear(rightEntries, year).length,
    );
    sideInnerCols = Math.max(sideInnerCols, compareInnerColsForItemCount(count));
  }
  const sideSectionWidth =
    compareGridSectionWidth(sideInnerCols, COMPARE_SIDE_INNER_COL_GAP) +
    2 * COMPARE_SIDE_SECTION_GUTTER;

  const centerInnerCols = COMPARE_CENTER_INNER_COLS;
  const centerGridWidth = compareGridSectionWidth(centerInnerCols, COMPARE_CENTER_INNER_COL_GAP);
  const centerSectionWidth = centerGridWidth + 2 * COMPARE_CENTER_SECTION_GUTTER;

  return {
    sideSectionWidth,
    sideInnerCols,
    centerSectionWidth,
    centerInnerCols,
    centerGridWidth,
  };
}

function sideGridOffsetX(metrics: CompareLayoutMetrics, yearInnerCols: number): number {
  const gridWidth = compareGridSectionWidth(yearInnerCols, COMPARE_SIDE_INNER_COL_GAP);
  const innerTrackWidth = metrics.sideSectionWidth - 2 * COMPARE_SIDE_SECTION_GUTTER;
  return COMPARE_SIDE_SECTION_GUTTER + Math.max(0, (innerTrackWidth - gridWidth) / 2);
}

function layoutCompareSideColumns(
  leftEntries: CompareColumnCourseEntry[],
  rightEntries: CompareColumnCourseEntry[],
  contentTop: number,
  metrics: CompareLayoutMetrics,
): { nodes: Node[]; bodyHeight: number } {
  const nodes: Node[] = [];
  const years = mergedSideYears(leftEntries, rightEntries);
  let y = contentTop;

  if (years.length === 0) {
    return { nodes, bodyHeight: 0 };
  }

  for (let yearIndex = 0; yearIndex < years.length; yearIndex += 1) {
    const year = years[yearIndex]!;
    if (yearIndex > 0) {
      y += COMPARE_YEAR_SECTION_GAP;
    }

    const bandY = y;
    const yearSlug = slugifyCompareId(year) || "sin-ano";
    for (const column of ["left", "right"] as const) {
      nodes.push({
        id: `compare-year-${column}-${yearSlug}-${yearIndex}`,
        type: "roadmapCompareYearBand",
        position: { x: columnOriginX(column, metrics), y: bandY },
        data: {
          label: year,
          showSeparator: yearIndex > 0,
          sectionWidth: metrics.sideSectionWidth,
        } satisfies RoadmapCompareYearBandNodeData,
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: 1,
      });
    }

    y += COMPARE_YEAR_BAND_HEIGHT;

    const leftYearEntries = entriesForYear(leftEntries, year);
    const rightYearEntries = entriesForYear(rightEntries, year);
    const yearInnerCols = compareInnerColsForItemCount(
      Math.max(leftYearEntries.length, rightYearEntries.length),
    );
    const gridTop = y;
    const blockHeight = Math.max(
      yearGroupGridHeight(leftYearEntries.length, yearInnerCols, COMPARE_SIDE_ROW_GAP),
      yearGroupGridHeight(rightYearEntries.length, yearInnerCols, COMPARE_SIDE_ROW_GAP),
    );
    const gridInsetX = sideGridOffsetX(metrics, yearInnerCols);

    pushCompareCourseNodes(
      nodes,
      "left",
      columnOriginX("left", metrics) + gridInsetX,
      gridTop,
      leftYearEntries,
      yearInnerCols,
      COMPARE_SIDE_INNER_COL_GAP,
      COMPARE_SIDE_ROW_GAP,
    );
    pushCompareCourseNodes(
      nodes,
      "right",
      columnOriginX("right", metrics) + gridInsetX,
      gridTop,
      rightYearEntries,
      yearInnerCols,
      COMPARE_SIDE_INNER_COL_GAP,
      COMPARE_SIDE_ROW_GAP,
    );

    y += blockHeight + COMPARE_YEAR_AFTER_GROUP_GAP;
  }

  return {
    nodes,
    bodyHeight: Math.max(y - contentTop, 0),
  };
}

export interface CompareFlowLayout {
  nodes: Node[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function buildCompareFlow(
  leftRoadmap: CourseRoadmap,
  rightRoadmap: CourseRoadmap,
): CompareFlowLayout {
  const partition = partitionCompareCourses(leftRoadmap, rightRoadmap);
  const nodes: Node[] = [];

  const contentTop = COMPARE_HEADER_HEIGHT + COMPARE_TOP_GUTTER;

  const leftEntries: CompareColumnCourseEntry[] = partition.onlyLeft.map((course) => ({
    id: `compare-left-${course.slug}`,
    label: course.title,
    year: course.year,
    groupYear: course.year,
    trayecto: course.trayecto,
  }));

  const centerEntries: CompareColumnCourseEntry[] = partition.shared.map((course) => ({
    id: `compare-shared-${course.slug}`,
    label: course.title,
    groupYear: course.leftYear,
    yearTooltip: `${leftRoadmap.degree}: ${course.leftYear} · ${rightRoadmap.degree}: ${course.rightYear}`,
  }));

  const rightEntries: CompareColumnCourseEntry[] = partition.onlyRight.map((course) => ({
    id: `compare-right-${course.slug}`,
    label: course.title,
    year: course.year,
    groupYear: course.year,
    trayecto: course.trayecto,
  }));

  const metrics = computeCompareLayoutMetrics(leftEntries, rightEntries, centerEntries);
  const sideLayout = layoutCompareSideColumns(leftEntries, rightEntries, contentTop, metrics);
  const centerLayout = layoutCompareCenterColumn(centerEntries, contentTop, metrics);

  const columnBodyHeight = Math.max(
    sideLayout.bodyHeight,
    centerLayout.bodyHeight,
    COMPARE_COURSE_NODE_HEIGHT,
  );

  const headerColumns: Array<{ key: "left" | "center" | "right"; label: string }> = [
    { key: "left", label: leftRoadmap.degreeDisplayName },
    { key: "center", label: COMPARE_CENTER_HEADER_LABEL },
    { key: "right", label: rightRoadmap.degreeDisplayName },
  ];

  const bgColumns: Array<{ key: "left" | "center" | "right" }> = [
    { key: "left" },
    { key: "center" },
    { key: "right" },
  ];

  for (const column of bgColumns) {
    const x = columnOriginX(column.key, metrics);
    const sectionWidth = compareSectionWidthForColumn(column.key, metrics);
    nodes.push({
      id: `compare-bg-${column.key}`,
      type: "roadmapCompareColumnBg",
      position: { x, y: COMPARE_HEADER_HEIGHT - 4 },
      data: {
        column: column.key,
        height: columnBodyHeight + COMPARE_TOP_GUTTER + 16,
        sectionWidth,
      } satisfies RoadmapCompareColumnBgNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    });
  }

  for (const column of headerColumns) {
    const x = columnOriginX(column.key, metrics);
    const sectionWidth = compareSectionWidthForColumn(column.key, metrics);
    nodes.push({
      id: `compare-header-${column.key}`,
      type: "roadmapCompareHeader",
      position: { x, y: 0 },
      data: {
        label: column.label,
        sectionWidth,
      } satisfies RoadmapCompareHeaderNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 2,
    });
  }

  nodes.push(...sideLayout.nodes, ...centerLayout.nodes);

  const totalWidth = compareCanvasContentWidth(metrics);
  const totalHeight = contentTop + columnBodyHeight + 8;

  return {
    nodes,
    bounds: {
      minX: -24,
      minY: -8,
      maxX: totalWidth + 24,
      maxY: totalHeight + 24,
    },
  };
}
