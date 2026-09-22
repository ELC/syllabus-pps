import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_END_ID } from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  sanitizeTrunkForkCuration,
  separateSpineRangeToBranches,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function roadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

describe("acid+trans tail separate layout", () => {
  const titles = ["modelo", "norm", "sql", "acid", "ar", "alg", "trans"];

  function afterMidForks(): RoadmapCuration {
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
    curation = separateSpineRangeToBranches(curation, "modelo", "norm").curation!;
    curation = separateSpineRangeToBranches(curation, "sql", "acid").curation!;
    return curation;
  }

  it("opens a fork after alg with acid|trans instead of corrupting the sql fork", () => {
    const tail = separateSpineRangeToBranches(afterMidForks(), "acid", "trans");
    expect(tail.ok).toBe(true);
    if (!tail.ok) {
      return;
    }

    const sqlFork = tail.curation.trunkForks!.find((fork) => fork.after === "sql");
    expect(sqlFork?.mergeInto).toBe("ar");
    expect(sqlFork?.lanes.map((lane) => lane.spine)).toEqual([["sql"]]);

    const tailFork = tail.curation.trunkForks!.find((fork) => fork.after === "alg");
    expect(tailFork).toMatchObject({
      after: "alg",
      mergeInto: "trans",
      lanes: [
        { root: "acid", spine: ["acid"] },
        { root: "trans", spine: ["trans"] },
      ],
    });

    expect(tail.curation.parallelLanes[0]!.spine).toEqual(["modelo"]);
    expect(tail.curation.trunkSpine).toEqual(["modelo", "sql", "ar", "alg", "trans"]);
  });

  it("repairs legacy tail forks that opened at an upstream merge anchor", () => {
    const legacy: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "modelo", spine: ["modelo"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: ["modelo", "sql", "ar", "alg", "trans"],
      trunkForks: [
        {
          after: "modelo",
          mergeInto: "sql",
          lanes: [
            { root: "modelo", spine: ["modelo"] },
            { root: "norm", spine: ["norm"] },
          ],
        },
        {
          after: "sql",
          mergeInto: "ar",
          lanes: [
            { root: "sql", spine: ["sql"] },
            { root: "acid", spine: ["acid"] },
          ],
        },
        {
          after: "ar",
          mergeInto: "trans",
          lanes: [
            { root: "acid", spine: ["acid"] },
            { root: "trans", spine: ["trans"] },
          ],
        },
      ],
    };

    sanitizeTrunkForkCuration(legacy);
    expect(legacy.trunkForks!.find((fork) => fork.mergeInto === "trans")?.after).toBe("alg");
  });

  it("routes acid and sql lanes into trans before objetivo", () => {
    let curation = afterMidForks();
    curation = separateSpineRangeToBranches(curation, "acid", "trans").curation!;

    const rm = roadmap(titles);
    const layout = buildRoadmapLayout(rm, buildAdjacency(rm), curation);
    const flow = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });

    const acid = layout.placements.get("acid")!;
    const trans = layout.placements.get("trans")!;
    expect(acid.y).toBe(trans.y);

    const edges = flow.edges
      .filter((e) => e.className?.includes("roadmap__edge--spine"))
      .map((e) => `${e.source}->${e.target}`);

    expect(edges, edges.join("\n")).toContain("sql->ar");
    expect(edges).toContain("alg->__join__out__alg");
    expect(edges).toContain("__join__out__alg->acid");
    expect(edges).toContain("__join__out__alg->trans");
    const dangling = ["acid", "sql", "ar", "alg", "trans"].filter(
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
});
