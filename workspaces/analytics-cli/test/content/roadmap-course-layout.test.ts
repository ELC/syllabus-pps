import { describe, expect, it } from "vitest";

import {
  normalizeRoadmapCourseLayoutPayload,
  ROADMAP_COURSE_GRID_COLUMN_COUNT,
  roadmapCourseGridColumnCount,
} from "@pps/content";

function paddedRow(...cells: string[]): string {
  const row = [...cells];
  while (row.length < ROADMAP_COURSE_GRID_COLUMN_COUNT) {
    row.push(".");
  }
  return row.join(" ");
}

describe("normalizeRoadmapCourseLayoutPayload", () => {
  it("accepts a full layout document", () => {
    const layout = normalizeRoadmapCourseLayoutPayload({
      courses: { pi: { slug: "programacion-i" } },
      years: { "año 1": { templateAreas: ["pi"] } },
    });

    expect(layout?.courses.pi?.slug).toBe("programacion-i");
    expect(layout?.years["año 1"]?.templateAreas).toEqual([paddedRow("pi")]);
  });

  it("accepts legacy years-only payloads", () => {
    const layout = normalizeRoadmapCourseLayoutPayload({
      "año 1": { templateAreas: ["pi"] },
    });

    expect(layout?.courses).toEqual({});
    expect(layout?.years["año 1"]?.templateAreas).toEqual([paddedRow("pi")]);
  });

  it("pads short rows to the fixed column count", () => {
    const layout = normalizeRoadmapCourseLayoutPayload({
      courses: {},
      years: {
        "año 2": {
          templateAreas: [". . discreta . . pii piii gestion ux"],
        },
      },
    });

    expect(layout?.years["año 2"]?.templateAreas[0]?.split(/\s+/)).toHaveLength(
      ROADMAP_COURSE_GRID_COLUMN_COUNT,
    );
  });

  it("pads LCD rows to twelve columns when degree slug is lcd", () => {
    const layout = normalizeRoadmapCourseLayoutPayload(
      {
        courses: {},
        years: { "año 1": { templateAreas: ["programacion-i"] } },
      },
      "lcd",
    );

    expect(layout?.years["año 1"]?.templateAreas[0]?.split(/\s+/)).toHaveLength(
      roadmapCourseGridColumnCount("lcd"),
    );
  });
});
