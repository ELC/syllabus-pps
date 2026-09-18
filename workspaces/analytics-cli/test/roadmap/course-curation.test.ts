import { describe, expect, it } from "vitest";

import {
  parseTemplateAreas,
  resolveCuratedGridMetrics,
  resolveCuratedRowStride,
  type CourseRoadmapCuration,
} from "../../../roadmap/src/components/roadmap/course-curation";

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
  it("uses configured node width and column gap", () => {
    expect(
      resolveCuratedGridMetrics(
        {
          degreeSlug: "lds",
          grid: { nodeWidth: 200, columnGap: 96 },
          courses: {},
          years: {},
        },
        { nodeWidth: 236, columnGap: 140 },
      ),
    ).toEqual({ nodeWidth: 200, columnGap: 96, stride: 296 });
  });

  it("falls back to layout defaults when grid is omitted", () => {
    expect(
      resolveCuratedGridMetrics(
        { degreeSlug: "lds", courses: {}, years: {} },
        { nodeWidth: 236, columnGap: 140 },
      ),
    ).toEqual({ nodeWidth: 236, columnGap: 140, stride: 376 });
  });
});

describe("resolveCuratedRowStride", () => {
  const defaults = {
    nodeHeight: 64,
    stageGap: 144,
    subrowGap: 64,
    yearGap: 112,
  };

  const curation = {
    degreeSlug: "lds",
    courses: {},
    years: {
      "año 1": {
        templateAreas: ["algebra", "pi"],
        templateRows: [240],
        yearGap: 200,
      },
      "año 2": {
        templateAreas: ["devops"],
      },
    },
  } satisfies CourseRoadmapCuration;

  it("uses templateRows within a year", () => {
    expect(
      resolveCuratedRowStride(
        curation,
        { year: "año 1", withinYearStage: 1, stage: 1, titles: ["programación i"] },
        { year: "año 1", withinYearStage: 0, stage: 0, titles: ["álgebra y geometría"] },
        defaults,
      ),
    ).toBe(240);
  });

  it("uses yearGap between year bands", () => {
    expect(
      resolveCuratedRowStride(
        curation,
        { year: "año 2", withinYearStage: 0, stage: 0, titles: ["introducción a devops"] },
        { year: "año 1", withinYearStage: 1, stage: 1, titles: ["programación i"] },
        defaults,
      ),
    ).toBe(200);
  });

  it("falls back to auto stride when rows are omitted", () => {
    expect(
      resolveCuratedRowStride(
        curation,
        { year: "año 2", withinYearStage: 0, stage: 0, titles: ["introducción a devops"] },
        { year: "año 2", withinYearStage: 0, stage: 0, titles: ["other"] },
        defaults,
      ),
    ).toBe(128);
  });
});
