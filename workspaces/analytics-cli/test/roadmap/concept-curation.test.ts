import { describe, expect, it } from "vitest";

import {
  attachConceptAsBranch,
  joinConceptSpinePaths,
  sliceCurationForCourse,
} from "../../../roadmap/src/components/roadmap/concept-curation";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import type { DegreeRoadmap } from "@pps/core";

const courseRoadmap: DegreeRoadmap = {
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "sql", slug: "sql", dependsOn: ["algoritmos"] },
    { title: "normalización", slug: "normalizacion", dependsOn: ["sql"] },
  ],
  edges: [],
};

const degreeCuration: RoadmapCuration = {
  degreeSlug: "lds",
  parallelLanes: [
    { root: "algoritmos", spine: ["algoritmos", "sql"] },
    { root: "otro", spine: ["otro"] },
  ],
  postMergeSpine: ["python"],
  branches: {
    sql: ["normalización", "extra fuera de alcance"],
    "modelo entidad-relación": ["normalización"],
  },
  branchOwnerOverrides: {},
  spineJoins: {},
};

describe("sliceCurationForCourse", () => {
  it("keeps only concepts that belong to the course subgraph", () => {
    const sliced = sliceCurationForCourse(degreeCuration, courseRoadmap);

    expect(sliced.parallelLanes).toEqual([
      { root: "algoritmos", spine: ["algoritmos", "sql"] },
    ]);
    expect(sliced.branches.sql).toEqual(["normalización"]);
    expect(sliced.postMergeSpine).toEqual([]);
  });
});

describe("attachConceptAsBranch", () => {
  it("moves a concept under a branch owner", () => {
    const base: RoadmapCuration = {
      ...degreeCuration,
      degreeSlug: "programacion-i",
      parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "sql", "normalización"] }],
      branches: {},
    };

    const next = attachConceptAsBranch(base, "sql", "normalización");

    expect(next.branches.sql).toContain("normalización");
    expect(next.branchOwnerOverrides["normalización"]).toBe("sql");
    expect(next.parallelLanes[0]!.spine).not.toContain("normalización");
  });
});

describe("joinConceptSpinePaths", () => {
  it("records a spine join between two concepts", () => {
    const next = joinConceptSpinePaths(degreeCuration, "algoritmos", "sql");

    expect(next.spineJoins.algoritmos).toBe("sql");
  });
});

describe("findNearestSpineTopicNode", () => {
  it("picks the closest spine node to a lateral topic", async () => {
    const { findNearestSpineTopicNode } = await import(
      "../../../roadmap/src/components/roadmap/concept-curation"
    );
    const nodes = [
      {
        id: "algoritmos",
        type: "roadmapTopic",
        position: { x: 0, y: 0 },
        width: 100,
        height: 40,
        data: { role: "spine" },
      },
      {
        id: "normalización",
        type: "roadmapTopic",
        position: { x: 120, y: 8 },
        width: 100,
        height: 40,
        data: { role: "branch" },
      },
    ] as import("@xyflow/react").Node[];

    expect(findNearestSpineTopicNode(nodes, "normalización")?.id).toBe("algoritmos");
  });
});
