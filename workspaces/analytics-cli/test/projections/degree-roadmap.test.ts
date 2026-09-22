import { describe, expect, it } from "vitest";
import { projectAllDegreeRoadmaps, projectDegreeRoadmap } from "@pps/core";
import { buildFixtureGraph } from "../support/fixtures";

describe("projectDegreeRoadmap", () => {
  it("projects concepts reachable from a degree through curriculum edges", () => {
    const graph = buildFixtureGraph();
    const roadmap = projectDegreeRoadmap(graph, "LDS");

    expect(roadmap).not.toBeNull();
    expect(roadmap?.degree).toBe("LDS");
    expect(roadmap?.concepts.map((concept) => concept.title)).toEqual(["algoritmos"]);
    expect(roadmap?.concepts[0]?.dependsOn).toEqual([]);
    expect(roadmap?.edges).toEqual([]);
  });

  it("lists one roadmap per degree page", () => {
    const roadmaps = projectAllDegreeRoadmaps(buildFixtureGraph());
    expect(roadmaps.map((roadmap) => roadmap.degree)).toEqual(["LDS"]);
  });
});
