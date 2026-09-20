import { describe, expect, it } from "vitest";
import { deriveExpectedCurriculum } from "@pps/core";
import { buildFixtureGraph } from "../support/fixtures";

describe("deriveExpectedCurriculum", () => {
  it("maps courses from year page wikilinks", () => {
    const graph = buildFixtureGraph();

    expect(deriveExpectedCurriculum(graph.pages)).toEqual({
      years: [
        {
          title: "LDS · año 1",
          courses: ["algoritmos y estructuras de datos"],
        },
      ],
    });
  });

  it("is attached to the built graph as graph.expected", () => {
    const graph = buildFixtureGraph();

    expect(graph.expected.years).toEqual([
      {
        title: "LDS · año 1",
        courses: ["algoritmos y estructuras de datos"],
      },
    ]);
  });
});
