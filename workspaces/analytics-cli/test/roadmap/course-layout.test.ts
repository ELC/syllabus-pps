import { describe, expect, it } from "vitest";
import {
  buildDegreeRoadmapAdjacency,
  degreeRoadmap,
  EdgeKind,
  type DegreeRoadmap,
} from "@pps/core";
import {
  assignCourseColumns,
  assignCourseColumnsByYear,
  assignCourseStages,
  buildStagedCourseRoadmapLayout,
  orderCourseRowsByBarycenter,
} from "../../../roadmap/src/components/roadmap/course-layout";

function courseRoadmap(
  courses: Array<{ title: string; year?: string; correlativas?: string[] }>,
): DegreeRoadmap {
  return degreeRoadmap({
    degree: "LDS",
    degreeSlug: "test",
    concepts: courses.map((course) => ({
      title: course.title,
      slug: course.title,
      dependsOn: course.correlativas ?? [],
    })),
    edges: courses.flatMap((course) =>
      (course.correlativas ?? []).map((prerequisite) => ({
        source: prerequisite,
        target: course.title,
        kind: EdgeKind.CoursePrerequisite,
        rawTarget: prerequisite,
        line: 0,
      })),
    ),
  });
}

describe("buildStagedCourseRoadmapLayout", () => {
  it("places every course without correlativas on stage zero", () => {
    const roadmap = courseRoadmap([
      { title: "álgebra y geometría" },
      { title: "programación i" },
      { title: "introducción a devops", correlativas: ["programación i"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const stages = assignCourseStages(
      roadmap.concepts.map((course) => course.title),
      adjacency,
    );

    expect(stages.get("álgebra y geometría")).toBe(0);
    expect(stages.get("programación i")).toBe(0);
    expect(stages.get("introducción a devops")).toBe(1);

    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency);
    expect(layout.placements.get("álgebra y geometría")?.stage).toBe(0);
    expect(layout.placements.get("programación i")?.stage).toBe(0);
    expect(layout.placements.get("introducción a devops")?.stage).toBe(1);
    expect(layout.placements.get("álgebra y geometría")?.y).toBe(
      layout.placements.get("programación i")?.y,
    );
    expect(layout.trunk).toEqual([]);
  });

  it("layers merge courses below their prerequisites", () => {
    const roadmap = courseRoadmap([
      { title: "programación i" },
      { title: "programación ii", correlativas: ["programación i"] },
      { title: "programación iii", correlativas: ["programación i"] },
      {
        title: "proyecto laboratorio",
        correlativas: ["programación i", "programación ii", "programación iii"],
      },
      { title: "product development", correlativas: ["proyecto laboratorio"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency);

    const stage = (title: string) => layout.placements.get(title)?.stage;
    expect(stage("programación i")).toBe(0);
    expect(stage("programación ii")).toBe(1);
    expect(stage("programación iii")).toBe(1);
    expect(stage("proyecto laboratorio")).toBe(2);
    expect(stage("product development")).toBe(3);
    expect(layout.placements.get("product development")!.y).toBeGreaterThan(
      layout.placements.get("proyecto laboratorio")!.y,
    );
  });

  it("keeps a linear chain in one vertical column", () => {
    const roadmap = courseRoadmap([
      { title: "programación i" },
      { title: "programación ii", correlativas: ["programación i"] },
      { title: "product development", correlativas: ["programación ii"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency);

    const centerX = (title: string) => {
      const placement = layout.placements.get(title);
      expect(placement).toBeDefined();
      return placement!.x + placement!.width / 2;
    };

    expect(centerX("programación ii")).toBeCloseTo(centerX("programación i"), 0);
    expect(centerX("product development")).toBeCloseTo(centerX("programación i"), 0);
  });

  it("places parallel forks beside their shared prerequisite", () => {
    const roadmap = courseRoadmap([
      { title: "programación i" },
      { title: "programación ii", correlativas: ["programación i"] },
      { title: "programación iii", correlativas: ["programación i"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency);

    const centerX = (title: string) => {
      const placement = layout.placements.get(title);
      expect(placement).toBeDefined();
      return placement!.x + placement!.width / 2;
    };

    expect(centerX("programación ii")).toBeCloseTo(centerX("programación i"), 0);
    expect(centerX("programación iii")).toBeGreaterThan(centerX("programación ii"));
  });

  it("groups courses by year from top to bottom", () => {
    const roadmap = courseRoadmap([
      { title: "programación i", year: "año 1" },
      { title: "introducción a devops", year: "año 2", correlativas: ["programación i"] },
      { title: "product development", year: "año 3", correlativas: ["introducción a devops"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const yearsByTitle = new Map(
      roadmap.concepts.map((course) => [
        course.title,
        course.title === "programación i"
          ? "año 1"
          : course.title === "introducción a devops"
            ? "año 2"
            : "año 3",
      ]),
    );
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency, yearsByTitle);

    expect(layout.placements.get("programación i")!.y).toBeLessThan(
      layout.placements.get("introducción a devops")!.y,
    );
    expect(layout.placements.get("introducción a devops")!.y).toBeLessThan(
      layout.placements.get("product development")!.y,
    );
  });

  it("layers correlativas below their prerequisites within a year", () => {
    const roadmap = courseRoadmap([
      { title: "programación ii", year: "año 2" },
      { title: "programación iii", year: "año 2", correlativas: ["programación ii"] },
      {
        title: "proyecto laboratorio",
        year: "año 2",
        correlativas: ["programación ii", "programación iii"],
      },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const yearsByTitle = new Map(roadmap.concepts.map((course) => [course.title, "año 2"]));
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency, yearsByTitle);

    expect(layout.placements.get("programación ii")!.y).toBeLessThan(
      layout.placements.get("programación iii")!.y,
    );
    expect(layout.placements.get("programación iii")!.y).toBeLessThan(
      layout.placements.get("proyecto laboratorio")!.y,
    );
  });

  it("resolves column collisions caused by curated offsets", () => {
    const roadmap = courseRoadmap([
      { title: "programación i", year: "año 1" },
      { title: "introducción a devops", year: "año 2", correlativas: ["programación i"] },
      { title: "gestión de proyectos", year: "año 2" },
      { title: "programación ii - web backend", year: "año 2", correlativas: ["programación i"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const yearsByTitle = new Map([
      ["programación i", "año 1"],
      ["introducción a devops", "año 2"],
      ["gestión de proyectos", "año 2"],
      ["programación ii - web backend", "año 2"],
    ]);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency, yearsByTitle);
    const placements = [...layout.placements.values()];

    for (let index = 0; index < placements.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
        const left = placements[index]!;
        const right = placements[otherIndex]!;
        const overlaps =
          left.x < right.x + right.width &&
          left.x + left.width > right.x &&
          left.y < right.y + right.height &&
          left.y + left.height > right.y;

        expect(overlaps).toBe(false);
      }
    }

  });

  it("applies explicit grid curation for LDS", () => {
    const roadmap = courseRoadmap([
      { title: "álgebra y geometría", year: "año 1" },
      { title: "programación i", year: "año 1", correlativas: ["algoritmos y estructuras de datos"] },
      { title: "algoritmos y estructuras de datos", year: "año 1" },
    ]);
    for (const concept of roadmap.concepts) {
      concept.slug =
        concept.title === "álgebra y geometría"
          ? "algebra-y-geometria"
          : concept.title === "programación i"
            ? "programacion-i"
            : "algoritmos-y-estructuras-de-datos";
    }
    roadmap.degreeSlug = "lds";
    roadmap.degree = "LDS";

    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const yearsByTitle = new Map([
      ["álgebra y geometría", "año 1"],
      ["programación i", "año 1"],
      ["algoritmos y estructuras de datos", "año 1"],
    ]);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency, yearsByTitle);

    expect(layout.placements.get("álgebra y geometría")?.y).toBe(
      layout.placements.get("algoritmos y estructuras de datos")?.y,
    );
    expect(layout.placements.get("programación i")?.y).toBeGreaterThan(
      layout.placements.get("álgebra y geometría")!.y,
    );
  });

  it("keeps every course below all of its correlativas", () => {
    const roadmap = courseRoadmap([
      { title: "programación i", year: "año 1" },
      { title: "programación ii", year: "año 2", correlativas: ["programación i"] },
      {
        title: "proyecto laboratorio",
        year: "año 2",
        correlativas: ["programación i", "programación ii"],
      },
      { title: "product development", year: "año 3", correlativas: ["proyecto laboratorio"] },
    ]);
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const yearsByTitle = new Map([
      ["programación i", "año 1"],
      ["programación ii", "año 2"],
      ["proyecto laboratorio", "año 2"],
      ["product development", "año 3"],
    ]);
    const layout = buildStagedCourseRoadmapLayout(roadmap, adjacency, yearsByTitle);

    for (const course of roadmap.concepts) {
      for (const prerequisite of course.dependsOn) {
        expect(layout.placements.get(course.title)!.y).toBeGreaterThan(
          layout.placements.get(prerequisite)!.y,
        );
      }
    }
  });
});
