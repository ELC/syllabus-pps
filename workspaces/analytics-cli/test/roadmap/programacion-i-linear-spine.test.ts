import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID, ROADMAP_START_ID } from "../../../roadmap/src/components/roadmap/constants";
import { sliceCurationForCourse } from "../../../roadmap/src/components/roadmap/concept-curation";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";

const programacionI: DegreeRoadmap = {
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "python", slug: "python", dependsOn: ["algoritmos"] },
    { title: "persistencia", slug: "persistencia", dependsOn: ["python"] },
  ],
  edges: [],
};

const ldsSliceSource: RoadmapCuration = {
  degreeSlug: "lds",
  parallelLanes: [{ root: "algoritmos", spine: ["algoritmos"] }],
  postMergeSpine: ["python"],
  trunkSpine: ["apis"],
  trunkForks: [],
  branches: { python: ["persistencia"] },
  branchOwnerOverrides: {},
  spineJoins: {},
  spinePromotions: [],
  branchLayoutFlips: {},
};

describe("programación i linear spine", () => {
  it("folds post-merge into a single lane when slicing the course", () => {
    const sliced = sliceCurationForCourse(ldsSliceSource, programacionI);

    expect(sliced.postMergeSpine).toEqual([]);
    expect(sliced.parallelLanes).toEqual([
      { root: "algoritmos", spine: ["algoritmos", "python"] },
    ]);
  });

  it("lays out algoritmos → python on one spine without junction dots", () => {
    const curation = sliceCurationForCourse(ldsSliceSource, programacionI);
    const adjacency = buildAdjacency(programacionI);
    const layout = buildRoadmapLayout(programacionI, adjacency, curation);

    expect(layout.trunk).toEqual(["algoritmos", "python"]);
    expect(layout.parallelLanes).toEqual([["algoritmos", "python"]]);

    const flow = buildRoadmapFlow({
      roadmap: programacionI,
      adjacency,
      layout,
      isTopicDone: () => false,
    });

    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    const spine = flow.edges
      .filter((edge) => edge.className?.includes("roadmap__edge--spine"))
      .map((edge) => `${edge.source}->${edge.target}`);

    expect(junctions).toHaveLength(0);
    expect(spine).toEqual([
      `${ROADMAP_START_ID}->algoritmos`,
      "algoritmos->python",
      `python->${ROADMAP_END_ID}`,
    ]);
  });

  it("matches exported curation (branch on python) without junctions after python", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "programacion-i",
      parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python"] }],
      postMergeSpine: [],
      trunkSpine: [],
      trunkForks: [],
      branches: { python: ["persistencia"] },
      branchOwnerOverrides: {},
      spineJoins: {},
      spinePromotions: [],
      branchLayoutFlips: {},
    };
    const adjacency = buildAdjacency(programacionI);
    const layout = buildRoadmapLayout(programacionI, adjacency, curation);
    expect(layout.placements.get("persistencia")?.role).toBe("branch");
    const flow = buildRoadmapFlow({
      roadmap: programacionI,
      adjacency,
      layout,
      isTopicDone: () => false,
    });

    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    if (junctions.length > 0) {
      const spine = flow.edges
        .filter((edge) => edge.className?.includes("roadmap__edge--spine"))
        .map((edge) => `${edge.source}->${edge.target}`);
      // eslint-disable-next-line no-console
      console.log({ junctions: junctions.map((n) => n.id), spine, layoutEnd: layout.end.y, pythonY: layout.placements.get("python")?.y });
    }
    expect(junctions).toHaveLength(0);
  });

  it("does not add a junction after python when another concept continues the trunk", () => {
    const roadmap: DegreeRoadmap = {
      ...programacionI,
      concepts: [
        { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
        { title: "python", slug: "python", dependsOn: ["algoritmos"] },
        {
          title: "programación orientada a objetos",
          slug: "programacion-orientada-a-objetos",
          dependsOn: ["python"],
        },
        { title: "persistencia", slug: "persistencia", dependsOn: ["python"] },
      ],
    };
    const curation: RoadmapCuration = {
      degreeSlug: "programacion-i",
      parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python"] }],
      postMergeSpine: [],
      trunkSpine: [],
      trunkForks: [],
      branches: { python: ["persistencia"] },
      branchOwnerOverrides: {},
      spineJoins: {},
      spinePromotions: [],
      branchLayoutFlips: {},
    };
    const adjacency = buildAdjacency(roadmap);
    const layout = buildRoadmapLayout(roadmap, adjacency, curation);
    const flow = buildRoadmapFlow({
      roadmap,
      adjacency,
      layout,
      isTopicDone: () => false,
    });
    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    expect(junctions.map((node) => node.id)).toEqual([]);
  });

  it("clears a bogus junction at python from inverted trunk vs lane order", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "programacion-i",
      parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python"] }],
      postMergeSpine: [],
      trunkSpine: [],
      trunkForks: [],
      branches: { python: ["persistencia"] },
      branchOwnerOverrides: {},
      spineJoins: {},
      spinePromotions: [],
      branchLayoutFlips: {},
    };
    const adjacency = buildAdjacency(programacionI);
    const layout = buildRoadmapLayout(programacionI, adjacency, curation);
    // Simulate stale compose order before harmonize (regression guard).
    const staleLayout = {
      ...layout,
      trunk: ["python", "algoritmos"] as string[],
      parallelLanes: [["algoritmos", "python"]] as string[][],
    };
    const flow = buildRoadmapFlow({
      roadmap: programacionI,
      adjacency,
      layout: staleLayout,
      isTopicDone: () => false,
    });
    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    expect(junctions.some((node) => node.id === "__join__in__python")).toBe(false);
    expect(junctions.some((node) => node.id === "__join__out__python")).toBe(false);
  });
});
