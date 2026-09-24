import { describe, expect, it } from "vitest";

import { PageKind, reachableFromDegree, type CurriculumGraph } from "@pps/core";

import { buildFixtureGraph } from "../support/fixtures";

describe("reachableFromDegree expected-years fallback", () => {
  it("seeds courses from graph.expected when year frontmatter links are absent", () => {
    const graph = buildFixtureGraph();
    const stripped: CurriculumGraph = {
      ...graph,
      pages: graph.pages.map((page) =>
        page.kind === PageKind.Year
          ? {
              ...page,
              courses: [],
              refs: page.refs.filter((ref) => {
                const target = ref.resolvedTarget ?? ref.target;
                return !graph.pages.some(
                  (candidate) =>
                    candidate.kind === PageKind.Course &&
                    (candidate.title === target ||
                      candidate.normalizedTitle === target.toLowerCase()),
                );
              }),
            }
          : page,
      ),
      edges: graph.edges.filter(
        (edge) =>
          !graph.pages.some(
            (year) =>
              year.kind === PageKind.Year &&
              year.title === edge.source &&
              graph.pages.some(
                (course) => course.kind === PageKind.Course && course.title === edge.target,
              ),
          ),
      ),
    };

    const reachable = reachableFromDegree(stripped, "LDS");
    expect([...reachable]).toContain("algoritmos y estructuras de datos");
  });
});
