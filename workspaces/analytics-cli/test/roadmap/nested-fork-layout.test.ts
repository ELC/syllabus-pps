import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import { separateSpineRangeToBranches } from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function roadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

describe("nested trunk fork layout", () => {
  it("places every trunk topic once after a nested fork separate", () => {
    const titles = ["m", "norm", "sql", "trans", "acid", "alg", "fin"];
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "m", spine: ["m"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["m", "norm", "sql", "trans", "acid", "alg", "fin"],
      trunkForks: [
        {
          after: "m",
          mergeInto: "sql",
          lanes: [
            { root: "norm", spine: ["norm"] },
            { root: "sql", spine: ["sql"] },
          ],
        },
      ],
    };

    const separated = separateSpineRangeToBranches(curation, "trans", "acid");
    expect(separated.ok).toBe(true);
    if (!separated.ok) {
      return;
    }

    expect(separated.curation.trunkSpine).toEqual(["m", "sql", "alg", "fin"]);
    expect(separated.curation.trunkSpine).toContain("sql");

    const adjacency = buildAdjacency(roadmap(titles));
    const layout = buildRoadmapLayout(roadmap(titles), adjacency, separated.curation);

    for (const title of ["m", "sql", "alg", "fin", "norm", "trans", "acid"]) {
      expect(layout.placements.has(title), `missing placement for ${title}`).toBe(true);
    }

    const flow = buildRoadmapFlow({
      roadmap: roadmap(titles),
      adjacency,
      layout,
      isTopicDone: () => false,
    });

    const junctions = flow.nodes.filter((node) => String(node.id).startsWith("__join__"));
    const dangling = junctions.filter((node) => {
      const id = String(node.id);
      const hasIn = flow.edges.some((edge) => edge.target === id);
      const hasOut = flow.edges.some((edge) => edge.source === id);
      return !hasIn || !hasOut;
    });
    expect(dangling.map((node) => node.id)).toEqual([]);
  });
});
