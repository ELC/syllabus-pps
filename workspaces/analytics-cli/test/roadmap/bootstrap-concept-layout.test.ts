import { degreeRoadmap } from "@pps/core";
import { describe, expect, it } from "vitest";

import { bootstrapConceptLayoutForCourse } from "../../../roadmap/src/components/roadmap/concept-curation-normalize";

const courseRoadmap = degreeRoadmap({
  degree: "programación i",
  degreeSlug: "programacion-i",
  concepts: [
    { title: "algoritmos", slug: "algoritmos", dependsOn: [] },
    { title: "python", slug: "python", dependsOn: ["algoritmos"] },
  ],
  edges: [],
});

describe("bootstrapConceptLayoutForCourse", () => {
  it("builds a linear spine from course concepts when Postgres has no row", () => {
    const curation = bootstrapConceptLayoutForCourse(courseRoadmap);
    expect(curation.parallelLanes[0]?.spine).toEqual(["algoritmos", "python"]);
    expect(curation.degreeSlug).toBe("programacion-i");
  });
});
