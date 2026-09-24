import { ROADMAP_COURSE_GRID_COLUMN_COUNT } from "@pps/content";
import { describe, expect, it } from "vitest";

import {
  moveAreaInCourseGrid,
  parseTemplateAreas,
  type CourseRoadmapCuration,
} from "../../../roadmap/src/components/roadmap/course-curation";

function paddedRow(...cells: string[]): string {
  const row = [...cells];
  while (row.length < ROADMAP_COURSE_GRID_COLUMN_COUNT) {
    row.push(".");
  }
  return row.join(" ");
}
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

describe("moveAreaInCourseGrid", () => {
  const curation: CourseRoadmapCuration = {
    degreeSlug: "lds",
    courses: {
      algebra: { slug: "algebra-y-geometria" },
      pi: { slug: "programacion-i" },
      empty: { slug: "unused" },
    },
    years: {
      "año 1": {
        templateAreas: ["algebra . pi"],
      },
    },
  };

  it("moves a course into an empty cell", () => {
    const next = moveAreaInCourseGrid(curation, "algebra", {
      year: "año 1",
      row: 0,
      column: 1,
    });

    expect(next.years["año 1"]!.templateAreas).toEqual([paddedRow(".", "algebra", "pi")]);
  });

  it("swaps two courses in the same row", () => {
    const next = moveAreaInCourseGrid(curation, "algebra", {
      year: "año 1",
      row: 0,
      column: 2,
    });

    expect(next.years["año 1"]!.templateAreas).toEqual([paddedRow("pi", ".", "algebra")]);
  });

  it("allows moving into column 9 when the row was shorter before normalization", () => {
    const wideYear: CourseRoadmapCuration = {
      ...curation,
      courses: {
        ...curation.courses,
        ux: { slug: "user-experience" },
        admin1: { slug: "administracion-i" },
      },
      years: {
        "año 2": {
          templateAreas: [". . discreta . . pii piii gestion ux", "est1 . . . devops proyecto admin1 . . etica"],
        },
      },
    };

    const next = moveAreaInCourseGrid(wideYear, "admin1", {
      year: "año 2",
      row: 0,
      column: 9,
    });

    const row = next.years["año 2"]!.templateAreas[0]!.split(/\s+/);
    expect(row).toHaveLength(ROADMAP_COURSE_GRID_COLUMN_COUNT);
    expect(row[8]).toBe("ux");
    expect(row[9]).toBe("admin1");
  });
});

describe("resolveCuratedGridMetrics", () => {
  const metrics: CuratedCourseLayoutMetrics = {
    nodeWidth: 250,
    nodeHeight: 92,
    columnGap: 90,
    rowStride: 130,
    yearGap: 185,
  };

  it("derives stride from layout metrics", () => {
    expect(resolveCuratedGridMetrics(metrics)).toEqual({
      nodeWidth: 250,
      nodeHeight: 92,
      columnGap: 90,
      stride: 340,
    });
  });
});

describe("resolveCuratedRowStride", () => {
  const metrics: CuratedCourseLayoutMetrics = {
    nodeWidth: 250,
    nodeHeight: 92,
    columnGap: 90,
    rowStride: 130,
    yearGap: 185,
  };

  const defaults = {
    nodeHeight: 92,
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
    ).toBe(130);
  });

  it("uses year gap between year bands", () => {
    expect(
      resolveCuratedRowStride(
        metrics,
        { year: "año 2", withinYearStage: 0 },
        { year: "año 1", withinYearStage: 1 },
        defaults,
      ),
    ).toBe(185);
  });

  it("falls back to subrow stride for parallel rows", () => {
    expect(
      resolveCuratedRowStride(
        metrics,
        { year: "año 2", withinYearStage: 0 },
        { year: "año 2", withinYearStage: 0 },
        defaults,
      ),
    ).toBe(156);
  });
});
