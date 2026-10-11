import { describe, expect, it } from "vitest";

import {
  buildCompareFlow,
  compareCoursesByYearColor,
  compareInnerColsForItemCount,
  compareGridSectionWidth,
  COMPARE_SIDE_INNER_COL_GAP,
  COMPARE_SIDE_SECTION_GUTTER,
  groupCompareEntriesByYear,
  partitionCompareCourses,
} from "../../../roadmap/src/components/roadmap/build-compare-flow";
import type { CourseRoadmap, CourseTrayecto } from "@pps/core";
import { COURSE_TRAYECTO_NO_ESTRUCTURADO, COURSE_TRAYECTO_PRINCIPAL } from "@pps/core";

function mockRoadmap(
  degree: string,
  slug: string,
  courses: Array<{ title: string; slug: string; year: string; trayecto?: CourseTrayecto }>,
  degreeDisplayName?: string,
): CourseRoadmap {
  return {
    degree,
    degreeDisplayName: degreeDisplayName ?? degree,
    degreeSlug: slug,
    courses: courses.map((course) => ({
      title: course.title,
      slug: course.slug,
      year: course.year,
      correlativas: [],
      concepts: [],
      trayecto: course.trayecto ?? COURSE_TRAYECTO_PRINCIPAL,
    })),
    edges: [],
  };
}

describe("partitionCompareCourses", () => {
  it("splits exclusive and shared courses by slug", () => {
    const left = mockRoadmap("LCD", "lcd", [
      { title: "estadística i", slug: "estadistica-i", year: "año 1" },
      { title: "solo lcd", slug: "solo-lcd", year: "año 2" },
    ]);
    const right = mockRoadmap("LDS", "lds", [
      { title: "estadística i", slug: "estadistica-i", year: "año 1" },
      { title: "solo lds", slug: "solo-lds", year: "año 3" },
    ]);

    const partition = partitionCompareCourses(left, right);

    expect(partition.onlyLeft.map((course) => course.slug)).toEqual(["solo-lcd"]);
    expect(partition.onlyRight.map((course) => course.slug)).toEqual(["solo-lds"]);
    expect(partition.shared).toEqual([
      expect.objectContaining({
        slug: "estadistica-i",
        leftYear: "año 1",
        rightYear: "año 1",
      }),
    ]);
  });

  it("treats courses without a year on one degree as exclusive to the other", () => {
    const left = mockRoadmap("LCD", "lcd", [
      { title: "solo lcd", slug: "solo-lcd", year: "año 2" },
      { title: "álgebra y geometría", slug: "algebra-y-geometria", year: "" },
    ]);
    const right = mockRoadmap("LDS", "lds", [
      { title: "álgebra y geometría", slug: "algebra-y-geometria", year: "año 1" },
    ]);

    const partition = partitionCompareCourses(left, right);

    expect(partition.onlyLeft.map((course) => course.slug)).toEqual(["solo-lcd"]);
    expect(partition.onlyRight.map((course) => course.slug)).toEqual(["algebra-y-geometria"]);
    expect(partition.shared).toEqual([]);
  });

  it("omits trayecto no estructurado (TNE) courses", () => {
    const left = mockRoadmap("LCD", "lcd", [
      { title: "tne lcd", slug: "tne-lcd", year: "año 1", trayecto: COURSE_TRAYECTO_NO_ESTRUCTURADO },
      { title: "principal lcd", slug: "p-lcd", year: "año 1" },
    ]);
    const right = mockRoadmap("LDS", "lds", [
      { title: "tne lds", slug: "tne-lds", year: "año 2", trayecto: COURSE_TRAYECTO_NO_ESTRUCTURADO },
      { title: "shared", slug: "shared", year: "año 1" },
      { title: "shared tne", slug: "shared-tne", year: "año 1", trayecto: COURSE_TRAYECTO_NO_ESTRUCTURADO },
    ]);

    const partition = partitionCompareCourses(left, right);

    expect(partition.onlyLeft.map((course) => course.slug)).toEqual(["p-lcd"]);
    expect(partition.onlyRight.map((course) => course.slug)).toEqual(["shared"]);
    expect(partition.shared.map((course) => course.slug)).toEqual([]);
  });

  it("orders courses by year color before title", () => {
    const ordered = compareCoursesByYearColor(
      [
        { title: "c", year: "año 3" },
        { title: "a", year: "año 1" },
        { title: "b", year: "año 2" },
      ],
      (course) => course.year,
      (course) => course.title,
    );

    expect(ordered.map((course) => course.title)).toEqual(["a", "b", "c"]);
  });

  it("groups entries by year in display order", () => {
    const groups = groupCompareEntriesByYear(
      [
        { label: "b", groupYear: "año 2" },
        { label: "a", groupYear: "año 1" },
        { label: "c", groupYear: "año 2" },
      ],
      (entry) => entry.groupYear,
    );

    expect(groups.map((group) => group.year)).toEqual(["año 1", "año 2"]);
    expect(groups[1]?.items.map((item) => item.label)).toEqual(["b", "c"]);
  });

  it("labels headers with degreeDisplayName and center title", () => {
    const left = mockRoadmap("LCD", "lcd", [], "Licenciatura en Ciencia de Datos");
    const right = mockRoadmap("LDS", "lds", [], "Licenciatura en Desarrollo de Software");
    const flow = buildCompareFlow(left, right);
    const headers = flow.nodes.filter((node) => node.type === "roadmapCompareHeader");

    expect(headers).toHaveLength(3);
    expect(headers.find((node) => node.id === "compare-header-left")?.data?.label).toBe(
      "Licenciatura en Ciencia de Datos",
    );
    expect(headers.find((node) => node.id === "compare-header-center")?.data?.label).toBe(
      "En común",
    );
    expect(headers.find((node) => node.id === "compare-header-right")?.data?.label).toBe(
      "Licenciatura en Desarrollo de Software",
    );
  });

  it("emits year band nodes on exclusive columns only", () => {
    const left = mockRoadmap("LCD", "lcd", [
      { title: "año 1 a", slug: "a1", year: "año 1" },
      { title: "año 2 a", slug: "a2", year: "año 2" },
      { title: "shared", slug: "shared", year: "año 1" },
    ]);
    const right = mockRoadmap("LDS", "lds", [
      { title: "shared", slug: "shared", year: "año 2" },
    ]);

    const flow = buildCompareFlow(left, right);
    const yearBands = flow.nodes.filter((node) => node.type === "roadmapCompareYearBand");

    expect(yearBands.some((node) => String(node.id).includes("compare-year-left"))).toBe(true);
    expect(yearBands.some((node) => String(node.id).includes("compare-year-right"))).toBe(true);
    expect(yearBands.some((node) => node.data?.showSeparator === true)).toBe(true);
    expect(flow.nodes.some((node) => node.id.startsWith("compare-year-center"))).toBe(false);
    expect(
      yearBands.every(
        (node) =>
          typeof node.data?.sectionWidth === "number" &&
          (node.data.sectionWidth as number) >=
            compareGridSectionWidth(2, COMPARE_SIDE_INNER_COL_GAP) + 2 * COMPARE_SIDE_SECTION_GUTTER,
      ),
    ).toBe(true);

    const leftBand = yearBands.find((node) => node.id === "compare-year-left-año-1-0");
    const rightBand = yearBands.find((node) => node.id === "compare-year-right-año-1-0");
    expect(leftBand?.position.y).toBe(rightBand?.position.y);
  });

  it("uses at most two rows per year block on sides", () => {
    expect(compareInnerColsForItemCount(1)).toBe(2);
    expect(compareInnerColsForItemCount(4)).toBe(2);
    expect(compareInnerColsForItemCount(5)).toBe(3);
    expect(compareInnerColsForItemCount(6)).toBe(3);
  });
});
