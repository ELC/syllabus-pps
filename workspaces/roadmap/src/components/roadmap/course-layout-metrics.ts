export interface CuratedCourseLayoutMetrics {
  nodeWidth: number;
  columnGap: number;
  rowStride: number;
  yearGap: number;
}

const METRIC_VARS = {
  nodeWidth: "--roadmap-course-node-width",
  columnGap: "--roadmap-course-column-gap",
  rowStride: "--roadmap-course-row-stride",
  yearGap: "--roadmap-course-year-gap",
} as const satisfies Record<keyof CuratedCourseLayoutMetrics, string>;

function readCssPixelProperty(root: Element, name: string): number | null {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw) {
    return null;
  }

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/** Read curated course grid metrics from roadmap SCSS custom properties. */
export function readCuratedCourseLayoutMetrics(
  root: Element | null = typeof document !== "undefined" ? document.documentElement : null,
): CuratedCourseLayoutMetrics | null {
  if (!root) {
    return null;
  }

  const nodeWidth = readCssPixelProperty(root, METRIC_VARS.nodeWidth);
  const columnGap = readCssPixelProperty(root, METRIC_VARS.columnGap);
  const rowStride = readCssPixelProperty(root, METRIC_VARS.rowStride);
  const yearGap = readCssPixelProperty(root, METRIC_VARS.yearGap);

  if (
    nodeWidth === null ||
    columnGap === null ||
    rowStride === null ||
    yearGap === null
  ) {
    return null;
  }

  return { nodeWidth, columnGap, rowStride, yearGap };
}

export function resolveCuratedGridMetrics(metrics: CuratedCourseLayoutMetrics): {
  nodeWidth: number;
  columnGap: number;
  stride: number;
} {
  return {
    nodeWidth: metrics.nodeWidth,
    columnGap: metrics.columnGap,
    stride: metrics.nodeWidth + metrics.columnGap,
  };
}

export interface CuratedRowStrideDefaults {
  nodeHeight: number;
  subrowGap: number;
}

/** Distance in px from the previous display row to the current one. */
export function resolveCuratedRowStride(
  metrics: CuratedCourseLayoutMetrics,
  row: { year: string; withinYearStage: number },
  previousRow: { year: string; withinYearStage: number },
  defaults: CuratedRowStrideDefaults,
): number {
  if (row.year !== previousRow.year) {
    return metrics.yearGap;
  }

  if (row.withinYearStage === previousRow.withinYearStage) {
    return defaults.nodeHeight + defaults.subrowGap;
  }

  return metrics.rowStride;
}
