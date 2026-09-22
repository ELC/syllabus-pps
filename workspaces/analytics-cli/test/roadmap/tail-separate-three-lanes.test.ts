import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID } from "../../../roadmap/src/components/roadmap/constants";
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

function spineEdges(layout: ReturnType<typeof buildRoadmapLayout>, titles: string[]) {
  const rm = roadmap(titles);
  const flow = buildRoadmapFlow({
    roadmap: rm,
    adjacency: buildAdjacency(rm),
    layout,
    isTopicDone: () => false,
  });
  return flow.edges
    .filter((e) => e.className?.includes("roadmap__edge--spine"))
    .map((e) => `${e.source}->${e.target}`);
}

describe("tail separate into parallel lanes before objetivo", () => {
  const titles = ["modelo", "norm", "sql", "acid", "ar", "alg", "trans"];

  function afterTwoForks(): RoadmapCuration {
    let curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: titles }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
      trunkForks: [],
    };
    const head = separateSpineRangeToBranches(curation, "modelo", "norm");
    if (!head.ok) {
      throw new Error("head separate failed");
    }
    const mid = separateSpineRangeToBranches(head.curation, "sql", "acid");
    if (!mid.ok) {
      throw new Error("mid separate failed");
    }
    return mid.curation;
  }

  it("separates acid and trans across fork lane and trunk using expanded spine order", () => {
    const curation = afterTwoForks();
    const tail = separateSpineRangeToBranches(curation, "acid", "trans");
    expect(tail.ok, tail.ok ? "" : JSON.stringify(tail)).toBe(true);
  });

  it("connects every tail lane into the final spine node before objetivo", () => {
    let curation = afterTwoForks();
    const tail = separateSpineRangeToBranches(curation, "alg", "trans");
    expect(tail.ok, tail.ok ? "" : JSON.stringify(tail)).toBe(true);
    if (!tail.ok) {
      return;
    }
    curation = tail.curation;

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    const edges = spineEdges(layout, titles);

    expect(layout.trunk[layout.trunk.length - 1]).toBe("trans");
    const tailJoin = "__join__in__trans";
    expect(edges).toContain(`alg->${tailJoin}`);
    expect(edges).toContain(`trans->${tailJoin}`);
    expect(edges).toContain(`${tailJoin}->${ROADMAP_END_ID}`);
    expect(edges).not.toContain("trans->__roadmap_end__");

    const dangling = ["acid", "ar", "alg", "sql", "trans"].filter(
      (title) =>
        !edges.some(
          (edge) =>
            edge.startsWith(`${title}->`) ||
            edge.includes(`->${title}`) ||
            edge.endsWith(`->${title}`),
        ),
    );
    expect(dangling, edges.join("\n")).toEqual([]);
  });

  it("moves stale tail fork anchors below spine-only titles inside the fork span", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "alg", spine: ["alg"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["alg", "modelo", "norm", "sql", "acid"],
      trunkForks: [
        {
          after: "alg",
          mergeInto: "acid",
          lanes: [
            { root: "trans", spine: ["trans"] },
            { root: "acid", spine: ["acid"] },
          ],
        },
      ],
    };

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    expect(layout.trunkForks[0]?.after).toBe("sql");
  });

  it("moves terminal lane-root forks below stale trunk titles when merge is lane-only", () => {
    const curation: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "alg", spine: ["alg"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["alg", "modelo", "norm", "sql"],
      trunkForks: [
        {
          after: "alg",
          mergeInto: "trans",
          lanes: [
            { root: "acid", spine: ["acid"] },
            { root: "trans", spine: ["trans"] },
          ],
        },
      ],
    };

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    expect(layout.trunkForks[0]?.after).toBe("sql");
  });
});
