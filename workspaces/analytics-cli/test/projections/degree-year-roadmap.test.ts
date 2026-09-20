import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraphFromLocalFiles } from "../../src/graph";
import { hydrateCurriculumGraph, projectAllCourseRoadmaps } from "@pps/core";
import { fixtureConfig } from "../support/fixtures";

describe("degree-year roadmap integration", () => {
  it("projects LDS courses from migrated year frontmatter", () => {
    const config = fixtureConfig();
    const graph = buildGraphFromLocalFiles({
      contentDir: resolve("../../content/pages"),
      config: { ...config, contentDir: resolve("../../content/pages") },
    });

    const roadmap = projectAllCourseRoadmaps(graph).find((entry) => entry.degree === "LDS");
    expect(roadmap).toBeDefined();
    expect(roadmap!.courses.length).toBeGreaterThan(30);
    expect(roadmap!.courses.some((course) => course.year === "año 1")).toBe(true);
  });

  it("hydrates artifacts that omit expected.years", () => {
    const config = fixtureConfig();
    const graph = buildGraphFromLocalFiles({
      contentDir: resolve("../../content/pages"),
      config: { ...config, contentDir: resolve("../../content/pages") },
    });

    const stale = {
      ...graph,
      expected: { years: [] },
    };

    const roadmap = projectAllCourseRoadmaps(hydrateCurriculumGraph(stale)).find(
      (entry) => entry.degree === "LDS",
    );
    expect(roadmap).toBeDefined();
    expect(roadmap!.courses.length).toBeGreaterThan(30);
  });
});
