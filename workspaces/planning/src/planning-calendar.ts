import { PLANNING_WEEK_COUNT, type PlanningPlanDocument, type PlanningWeek } from "@pps/content";

export const PLANNING_CALENDAR_COLUMNS = 4;

export interface ConceptTopicSpan {
  slug: string;
  startWeek: number;
  endWeek: number;
}

export type CalendarRibbonRole = "topic" | "prerequisite";

export interface CalendarRowRibbon {
  slug: string;
  role: CalendarRibbonRole;
  lane: number;
  colStart: number;
  colEnd: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  showLabel: boolean;
}

export function buildProgramWeekGrid(
  weekCount = PLANNING_WEEK_COUNT,
): (number | null)[][] {
  const rows: (number | null)[][] = [];
  for (let week = 1; week <= weekCount; week += PLANNING_CALENDAR_COLUMNS) {
    const row: (number | null)[] = [];
    for (let column = 0; column < PLANNING_CALENDAR_COLUMNS; column += 1) {
      const weekNumber = week + column;
      row.push(weekNumber <= weekCount ? weekNumber : null);
    }
    rows.push(row);
  }
  return rows;
}

export function conceptWeekSpans(
  weeks: readonly PlanningWeek[],
  column: keyof Pick<PlanningWeek, "topic" | "prerequisite">,
): ConceptTopicSpan[] {
  const weeksBySlug = new Map<string, number[]>();

  weeks.forEach((week, index) => {
    for (const slug of week[column]) {
      const list = weeksBySlug.get(slug) ?? [];
      list.push(index + 1);
      weeksBySlug.set(slug, list);
    }
  });

  const spans: ConceptTopicSpan[] = [];
  for (const [slug, weekNumbers] of weeksBySlug) {
    const sorted = [...new Set(weekNumbers)].sort((left, right) => left - right);
    let start = sorted[0]!;
    let previous = sorted[0]!;
    for (let index = 1; index < sorted.length; index += 1) {
      const week = sorted[index]!;
      if (week === previous + 1) {
        previous = week;
        continue;
      }
      spans.push({ slug, startWeek: start, endWeek: previous });
      start = week;
      previous = week;
    }
    spans.push({ slug, startWeek: start, endWeek: previous });
  }

  return spans.sort(
    (left, right) => left.startWeek - right.startWeek || left.slug.localeCompare(right.slug),
  );
}

export function conceptTopicSpans(weeks: readonly PlanningWeek[]): ConceptTopicSpan[] {
  return conceptWeekSpans(weeks, "topic");
}

export function conceptPrerequisiteSpans(weeks: readonly PlanningWeek[]): ConceptTopicSpan[] {
  return conceptWeekSpans(weeks, "prerequisite");
}

export function conceptTopicSpansFromPlan(plan: PlanningPlanDocument): ConceptTopicSpan[] {
  return conceptWeekSpans(plan.weeks, "topic");
}

export function conceptPrerequisiteSpansFromPlan(plan: PlanningPlanDocument): ConceptTopicSpan[] {
  return conceptWeekSpans(plan.weeks, "prerequisite");
}

export function spanLaneKey(
  role: CalendarRibbonRole,
  span: Pick<ConceptTopicSpan, "slug" | "startWeek" | "endWeek">,
): string {
  return `${role}:${span.slug}:${span.startWeek}:${span.endWeek}`;
}

export function assignGlobalSpanLanes(
  topicSpans: readonly ConceptTopicSpan[],
  prerequisiteSpans: readonly ConceptTopicSpan[],
): Map<string, number> {
  const timedSpans = [
    ...topicSpans.map((span) => ({ role: "topic" as const, span })),
    ...prerequisiteSpans.map((span) => ({ role: "prerequisite" as const, span })),
  ].sort(
    (left, right) =>
      left.span.startWeek - right.span.startWeek
      || left.span.endWeek - left.span.startWeek - (right.span.endWeek - right.span.startWeek)
      || left.span.slug.localeCompare(right.span.slug),
  );

  const laneEnds: number[] = [];
  const laneBySpanKey = new Map<string, number>();

  for (const { role, span } of timedSpans) {
    let lane = laneEnds.findIndex((lastWeek) => lastWeek < span.startWeek);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.endWeek);
    } else {
      laneEnds[lane] = span.endWeek;
    }
    laneBySpanKey.set(spanLaneKey(role, span), lane);
  }

  return laneBySpanKey;
}

export function ribbonsForCalendarRow(
  row: readonly (number | null)[],
  spans: readonly ConceptTopicSpan[],
  role: CalendarRibbonRole,
  laneBySpanKey: ReadonlyMap<string, number>,
): CalendarRowRibbon[] {
  const weekToColumn = new Map<number, number>();
  row.forEach((week, column) => {
    if (week != null) {
      weekToColumn.set(week, column);
    }
  });

  const weeksInRow = row.filter((week): week is number => week != null);
  if (weeksInRow.length === 0) {
    return [];
  }

  const minWeek = Math.min(...weeksInRow);
  const maxWeek = Math.max(...weeksInRow);
  const ribbons: CalendarRowRibbon[] = [];

  for (const span of spans) {
    if (span.endWeek < minWeek || span.startWeek > maxWeek) {
      continue;
    }

    const overlapStart = Math.max(span.startWeek, minWeek);
    const overlapEnd = Math.min(span.endWeek, maxWeek);
    const startColumn = weekToColumn.get(overlapStart);
    const endColumn = weekToColumn.get(overlapEnd);
    const lane = laneBySpanKey.get(spanLaneKey(role, span));
    if (startColumn == null || endColumn == null || lane == null) {
      continue;
    }

    ribbons.push({
      slug: span.slug,
      role,
      lane,
      colStart: Math.min(startColumn, endColumn),
      colEnd: Math.max(startColumn, endColumn),
      continuesBefore: span.startWeek < minWeek,
      continuesAfter: span.endWeek > maxWeek,
      showLabel: overlapStart === span.startWeek || span.startWeek < minWeek,
    });
  }

  return ribbons;
}

export function ribbonsForCalendarRowAllRoles(
  row: readonly (number | null)[],
  topicSpans: readonly ConceptTopicSpan[],
  prerequisiteSpans: readonly ConceptTopicSpan[],
  laneBySpanKey: ReadonlyMap<string, number>,
): CalendarRowRibbon[] {
  return [
    ...ribbonsForCalendarRow(row, topicSpans, "topic", laneBySpanKey),
    ...ribbonsForCalendarRow(row, prerequisiteSpans, "prerequisite", laneBySpanKey),
  ];
}

/** Okabe–Ito (colorblind-safe); black/gray omitted for ribbon contrast on light UI. */
export const OKABE_ITO_RIBBON_COLORS = [
  { bg: "#E69F00", fg: "#1c1917" },
  { bg: "#56B4E9", fg: "#1c1917" },
  { bg: "#009E73", fg: "#ffffff" },
  { bg: "#F0E442", fg: "#1c1917" },
  { bg: "#0072B2", fg: "#ffffff" },
  { bg: "#D55E00", fg: "#ffffff" },
  { bg: "#CC79A7", fg: "#1c1917" },
] as const;

export interface ConceptRibbonStyle {
  backgroundColor?: string;
  color?: string;
  "--planning-calendar-stripe-color"?: string;
}

function conceptPaletteIndex(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % OKABE_ITO_RIBBON_COLORS.length;
}

export function ribbonStyleForConcept(
  slug: string,
  role: CalendarRibbonRole = "topic",
): ConceptRibbonStyle {
  const entry = OKABE_ITO_RIBBON_COLORS[conceptPaletteIndex(slug)]!;
  if (role === "prerequisite") {
    return {
      "--planning-calendar-stripe-color": entry.bg,
    };
  }
  return { backgroundColor: entry.bg, color: entry.fg };
}

export function ribbonRowClasses(ribbon: CalendarRowRibbon): string[] {
  const classes = ["planning-calendar__ribbon", `planning-calendar__ribbon--${ribbon.role}`];
  if (ribbon.continuesBefore) {
    classes.push("planning-calendar__ribbon--continues-before");
  }
  if (ribbon.continuesAfter) {
    classes.push("planning-calendar__ribbon--continues-after");
  }
  if (
    ribbon.colStart === ribbon.colEnd
    && !ribbon.continuesBefore
    && !ribbon.continuesAfter
  ) {
    classes.push("planning-calendar__ribbon--alone");
  }
  return classes;
}

/** @deprecated Use ribbonStyleForConcept */
export function ribbonColorForConcept(slug: string): string {
  return ribbonStyleForConcept(slug).backgroundColor ?? OKABE_ITO_RIBBON_COLORS[0]!.bg;
}
