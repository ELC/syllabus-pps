import { degreeRoadmap, roadmapCuration, type RoadmapCuration } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildDegreeRoadmapAdjacency } from "@pps/core";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID, ROADMAP_START_ID } from "../../../roadmap/src/components/roadmap/constants";
import { sliceCurationForCourse } from "../../../roadmap/src/components/roadmap/concept-curation";
import { openRoadmapCurationLinearNormalization } from "../../../roadmap/src/components/roadmap/concept-curation-normalize";
import { buildLinearConceptLayout } from "../../../roadmap/src/components/roadmap/layout";

const programacionI = degreeRoadmap({
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "python", slug: "python", dependsOn: ["algoritmos"] },
    { title: "persistencia", slug: "persistencia", dependsOn: ["python"] },
  ],
  edges: [],
});

function linearCuration(raw: RoadmapCuration, courseRoadmap: typeof programacionI): RoadmapCuration {
  const sliced = sliceCurationForCourse(raw, courseRoadmap);
  return openRoadmapCurationLinearNormalization(sliced).forCourse(courseRoadmap).curation;
}

describe("programación i linear spine", () => {
  it("lays out algoritmos → python on one spine without junction dots", () => {
    const curation = linearCuration(
      roadmapCuration({
        degreeSlug: "programacion-i",
        parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python"] }],
        branches: {},
        branchOwnerOverrides: {},
      }),
      programacionI,
    );
    const adjacency = buildDegreeRoadmapAdjacency(programacionI);
    const layout = buildLinearConceptLayout(programacionI, curation);

    expect(layout.trunk).toEqual(["algoritmos", "python"]);

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
    const curation = linearCuration(
      roadmapCuration({
        degreeSlug: "programacion-i",
        parallelLanes: [{ root: "algoritmos", spine: ["algoritmos", "python"] }],
        branches: { python: ["persistencia"] },
        branchOwnerOverrides: {},
      }),
      programacionI,
    );
    const adjacency = buildDegreeRoadmapAdjacency(programacionI);
    const layout = buildLinearConceptLayout(programacionI, curation);
    expect(layout.placements.get("persistencia")?.role).toBe("branch");
    const flow = buildRoadmapFlow({
      roadmap: programacionI,
      adjacency,
      layout,
      isTopicDone: () => false,
    });

    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    expect(junctions).toHaveLength(0);
  });

  it("does not add a junction after python when another concept continues the trunk", () => {
    const roadmap = degreeRoadmap({
      degree: programacionI.degree,
      degreeSlug: programacionI.degreeSlug,
      edges: programacionI.edges,
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
    });
    const curation = linearCuration(
      roadmapCuration({
        degreeSlug: "programacion-i",
        parallelLanes: [
          {
            root: "algoritmos",
            spine: ["algoritmos", "python", "programación orientada a objetos"],
          },
        ],
        branches: { python: ["persistencia"] },
        branchOwnerOverrides: {},
      }),
      roadmap,
    );
    const adjacency = buildDegreeRoadmapAdjacency(roadmap);
    const layout = buildLinearConceptLayout(roadmap, curation);
    const flow = buildRoadmapFlow({
      roadmap,
      adjacency,
      layout,
      isTopicDone: () => false,
    });
    const junctions = flow.nodes.filter((node) => String(node.id).includes("__join__"));
    expect(junctions.map((node) => node.id)).toEqual([]);
  });
});
