import { describe, expect, it } from "vitest";

import { parseTemplateAreas } from "../../../roadmap/src/components/roadmap/course-curation";
import {
  resolveCuratedGridMetrics,
  resolveCuratedRowStride,
  type CuratedCourseLayoutMetrics,
} from "../../../roadmap/src/components/roadmap/course-layout-metrics";

describe("parseTemplateAreas", () => {
  const courses = {
    algebra: { slug: "algebra-y-geometria" },
    pi: { slug: "programacion-i" },
  };

  const slugToTitle = new Map([
    ["algebra-y-geometria", "álgebra y geometría"],
    ["programacion-i", "programación i"],
  ]);

  it("maps area ids through the course registry to grid slots", () => {
    const slots = parseTemplateAreas(["algebra . pi"], courses, slugToTitle);

    expect(slots.get("álgebra y geometría")).toEqual({ row: 0, column: 0 });
    expect(slots.get("programación i")).toEqual({ row: 0, column: 2 });
    expect(slots.size).toBe(2);
  });
});

describe("resolveCuratedGridMetrics", () => {
  const metrics: CuratedCourseLayoutMetrics = {
    nodeWidth: 195,
    columnGap: 70,
    rowStride: 104,
    yearGap: 150,
  };

  it("derives stride from layout metrics", () => {
    expect(resolveCuratedGridMetrics(metrics)).toEqual({
      nodeWidth: 195,
      columnGap: 70,
      stride: 265,
    });
  });
});

describe("resolveCuratedRowStride", () => {
  const metrics: CuratedCourseLayoutMetrics = {
    nodeWidth: 195,
    columnGap: 70,
    rowStride: 104,
    yearGap: 150,
  };

  const defaults = {
    nodeHeight: 64,
    subrowGap: 64,
  };

  it("uses row stride within a year", () => {
    expect(
      resolveCuratedRowStride(
        metrics,
        { year: "año 1", withinYearStage: 1 },
        { year: "año 1", withinYearStage: 0 },
        defaults,
      ),
    ).toBe(104);
  });

  it("uses year gap between year bands", () => {
    expect(
      resolveCuratedRowStride(
        metrics,
        { year: "año 2", withinYearStage: 0 },
        { year: "año 1", withinYearStage: 1 },
        defaults,
      ),
    ).toBe(150);
  });

  it("falls back to subrow stride for parallel rows", () => {
    expect(
      resolveCuratedRowStride(
        metrics,
        { year: "año 2", withinYearStage: 0 },
        { year: "año 2", withinYearStage: 0 },
        defaults,
      ),
    ).toBe(128);
  });
});
