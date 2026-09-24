import { describe, expect, it } from "vitest";

import { emptyPlanningPlan, normalizePlanningPlan } from "@pps/content";

import {
  assignGlobalSpanLanes,
  buildProgramWeekGrid,
  conceptTopicSpans,
  OKABE_ITO_RIBBON_COLORS,
  ribbonStyleForConcept,
  ribbonsForCalendarRow,
} from "../../../planning/src/planning-calendar";

describe("ribbonStyleForConcept", () => {
  it("uses Okabe–Ito palette colors", () => {
    const style = ribbonStyleForConcept("algoritmos");
    expect(OKABE_ITO_RIBBON_COLORS.some((entry) => entry.bg === style.backgroundColor)).toBe(true);
    expect(style.color === "#ffffff" || style.color === "#1c1917").toBe(true);
  });

  it("shares the same hue for a concept across roles", () => {
    const topic = ribbonStyleForConcept("sql", "topic");
    const prereq = ribbonStyleForConcept("sql", "prerequisite");
    expect(prereq["--planning-calendar-stripe-color"]).toBe(topic.backgroundColor);
  });

  it("does not put topic foreground on sugerido stripes (light background)", () => {
    const prereq = ribbonStyleForConcept("modelo-entidad-relacion", "prerequisite");
    expect(prereq.color).toBeUndefined();
  });
});

describe("buildProgramWeekGrid", () => {
  it("lays fifteen weeks in four rows of four", () => {
    expect(buildProgramWeekGrid()).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, null],
    ]);
  });
});

describe("conceptTopicSpans", () => {
  it("merges consecutive topic weeks and splits gaps", () => {
    const plan = normalizePlanningPlan({
      weeks: emptyPlanningPlan().weeks.map((week, index) => ({
        ...week,
        topic:
          index === 0 || index === 1 || index === 2
            ? ["alpha"]
            : index === 4
              ? ["alpha"]
              : [],
      })),
    });

    expect(conceptTopicSpans(plan.weeks)).toEqual([
      { slug: "alpha", startWeek: 1, endWeek: 3 },
      { slug: "alpha", startWeek: 5, endWeek: 5 },
    ]);
  });
});

describe("ribbonsForCalendarRow", () => {
  it("stacks overlapping concepts on separate lanes", () => {
    const row = [1, 2, 3, 4] as const;
    const spans = [
      { slug: "a", startWeek: 1, endWeek: 3 },
      { slug: "b", startWeek: 2, endWeek: 4 },
    ];

    const laneBySpanKey = assignGlobalSpanLanes(spans, []);
    const ribbons = ribbonsForCalendarRow(row, spans, "topic", laneBySpanKey);
    expect(ribbons).toHaveLength(2);
    expect(new Set(ribbons.map((ribbon) => ribbon.lane)).size).toBe(2);
    expect(ribbons.find((ribbon) => ribbon.slug === "a")?.colStart).toBe(0);
    expect(ribbons.find((ribbon) => ribbon.slug === "b")?.continuesAfter).toBe(false);
  });

  it("marks ribbons that continue on the next row", () => {
    const row = [1, 2, 3, 4] as const;
    const spans = [{ slug: "long", startWeek: 3, endWeek: 6 }];

    const laneBySpanKey = assignGlobalSpanLanes(spans, []);
    const ribbon = ribbonsForCalendarRow(row, spans, "topic", laneBySpanKey)[0];
    expect(ribbon?.continuesAfter).toBe(true);
    expect(ribbon?.continuesBefore).toBe(false);
    expect(ribbon?.colStart).toBe(2);
    expect(ribbon?.colEnd).toBe(3);
  });

  it("continues a span from the previous row", () => {
    const row = [5, 6, 7, 8] as const;
    const spans = [{ slug: "long", startWeek: 3, endWeek: 6 }];

    const laneBySpanKey = assignGlobalSpanLanes(spans, []);
    const ribbon = ribbonsForCalendarRow(row, spans, "topic", laneBySpanKey)[0];
    expect(ribbon?.continuesBefore).toBe(true);
    expect(ribbon?.continuesAfter).toBe(false);
    expect(ribbon?.colStart).toBe(0);
    expect(ribbon?.colEnd).toBe(1);
  });

  it("keeps the same lane when a span continues on the next row", () => {
    const spans = [{ slug: "normalizacion", startWeek: 12, endWeek: 15 }];
    const laneBySpanKey = assignGlobalSpanLanes(spans, []);
    const rowA = [9, 10, 11, 12] as const;
    const rowB = [13, 14, 15, null] as const;

    const laneA = ribbonsForCalendarRow(rowA, spans, "topic", laneBySpanKey)[0]?.lane;
    const laneB = ribbonsForCalendarRow(rowB, spans, "topic", laneBySpanKey)[0]?.lane;
    expect(laneA).toBe(laneB);
  });
});
