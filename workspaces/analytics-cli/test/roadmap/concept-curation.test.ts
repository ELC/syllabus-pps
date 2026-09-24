import { degreeRoadmap, roadmapCuration } from "@pps/core";
import { describe, expect, it } from "vitest";

import { sliceCurationForCourse } from "../../../roadmap/src/components/roadmap/concept-curation";

const courseRoadmap = degreeRoadmap({
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "sql", slug: "sql", dependsOn: ["algoritmos"] },
    { title: "normalización", slug: "normalizacion", dependsOn: ["sql"] },
  ],
  edges: [],
});

const degreeCuration = roadmapCuration({
  degreeSlug: "lds",
  parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "sql"] }],
  branches: {
    sql: ["normalización", "extra fuera de alcance"],
    "modelo entidad-relación": ["normalización"],
  },
  branchOwnerOverrides: {},
});

describe("sliceCurationForCourse", () => {
  it("keeps only concepts that belong to the course subgraph", () => {
    const sliced = sliceCurationForCourse(degreeCuration, courseRoadmap);

    expect(sliced.parallelLanes).toEqual([
      { root: "algoritmos", spine: ["algoritmos", "sql"] },
    ]);
    expect(sliced.branches.sql).toEqual(["normalización"]);
  });
});
