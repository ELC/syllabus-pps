import type { DegreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { buildAdjacency } from "../../../roadmap/src/components/roadmap/adjacency";
import { buildRoadmapFlow } from "../../../roadmap/src/components/roadmap/build-flow";
import { ROADMAP_START_ID } from "../../../roadmap/src/components/roadmap/constants";
import { buildRoadmapLayout } from "../../../roadmap/src/components/roadmap/layout";
import type { RoadmapCuration } from "../../../roadmap/src/components/roadmap/curation";
import {
  mergeTrunkFork,
  separateSpineRangeToBranches,
} from "../../../roadmap/src/components/roadmap/concept-curation-ops";

function linearRoadmap(titles: string[]): DegreeRoadmap {
  return {
    degree: "T",
    degreeSlug: "t",
    concepts: titles.map((title) => ({ title, slug: title, dependsOn: [] })),
    edges: [],
  };
}

function spineLinks(layout: ReturnType<typeof buildRoadmapLayout>) {
  const roadmap = linearRoadmap(["a", "b", "c", "d"]);
  const adjacency = buildAdjacency(roadmap);
  const flow = buildRoadmapFlow({
    roadmap,
    adjacency,
    layout,
    isTopicDone: () => false,
  });

  return {
    junctions: flow.nodes.filter((node) => String(node.id).startsWith("__join__")).map((node) => node.id),
    edges: flow.edges
      .filter((edge) => edge.className?.includes("roadmap__edge--spine"))
      .map((edge) => `${edge.source}->${edge.target}`),
  };
}

describe("concept map spine flow", () => {
  it("lays out a head fork from parallel-only spine storage", () => {
    const base: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
    };

    const separated = separateSpineRangeToBranches(base, "a", "b");
    expect(separated.ok).toBe(true);
    if (!separated.ok) {
      return;
    }

    const roadmap = linearRoadmap(["a", "b", "c", "d"]);
    const adjacency = buildAdjacency(roadmap);
    const layout = buildRoadmapLayout(roadmap, adjacency, separated.curation);

    expect(layout.trunkForks).toHaveLength(1);
    expect(layout.placements.has("a")).toBe(true);
    expect(layout.placements.has("b")).toBe(true);
    expect(layout.placements.get("a")!.y).toBe(layout.placements.get("b")!.y);

    const flow = spineLinks(layout);
    const inicioJunction = `__join__out__${ROADMAP_START_ID}`;
    const mergeJunction = "__join__in__c";
    expect(flow.junctions).toEqual([inicioJunction, mergeJunction]);
    expect(flow.junctions).not.toContain("__join__out__a");
    expect(flow.edges).not.toContain("a->b");
    expect(flow.edges.some((edge) => edge.startsWith("a->__join__out__"))).toBe(false);
    expect(flow.edges).toContain(`${inicioJunction}->a`);
    expect(flow.edges).toContain(`${inicioJunction}->b`);
    expect(flow.edges).toContain(`a->${mergeJunction}`);
    expect(flow.edges).toContain(`b->${mergeJunction}`);
    expect(flow.edges).toContain(`${mergeJunction}->c`);
    expect(flow.edges).not.toContain("a->c");
    expect(flow.edges).not.toContain("b->c");

    const rm = linearRoadmap(["a", "b", "c", "d"]);
    const flowFull = buildRoadmapFlow({
      roadmap: rm,
      adjacency: buildAdjacency(rm),
      layout,
      isTopicDone: () => false,
    });
    const mergeNode = flowFull.nodes.find((n) => n.id === mergeJunction);
    const inicioNode = flowFull.nodes.find((n) => n.id === inicioJunction);
    expect(inicioNode?.position.x).toBeCloseTo(0, 0);
    expect(mergeNode?.position.x).toBeCloseTo(0, 0);
  });

  it("does not leave join junctions after collapsing a head fork", () => {
    const base: RoadmapCuration = {
      degreeSlug: "t",
      parallelLanes: [{ root: "a", spine: ["a", "b", "c", "d"] }],
      postMergeSpine: [],
      branches: {},
      branchOwnerOverrides: {},
      spineJoins: {},
      trunkSpine: [],
    };

    const separated = separateSpineRangeToBranches(base, "a", "b");
    expect(separated.ok).toBe(true);
    if (!separated.ok) {
      return;
    }

    const merged = mergeTrunkFork(separated.curation, "a");
    expect(merged.ok).toBe(true);
    if (!merged.ok) {
      return;
    }

    const roadmap = linearRoadmap(["a", "b", "c", "d"]);
    const adjacency = buildAdjacency(roadmap);
    const layout = buildRoadmapLayout(roadmap, adjacency, merged.curation);
    const flow = spineLinks(layout);

    expect(merged.curation.parallelLanes[0]!.spine).toEqual(["a", "b", "c", "d"]);
    expect(flow.junctions).toEqual([]);
    expect(flow.edges).toContain(`${ROADMAP_START_ID}->a`);
    expect(flow.edges).toContain("a->b");
    expect(flow.edges.filter((edge) => edge.endsWith("->b"))).toHaveLength(1);
  });
});
