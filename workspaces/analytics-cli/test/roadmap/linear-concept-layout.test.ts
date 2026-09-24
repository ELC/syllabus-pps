import { describe, expect, it } from "vitest";

import {
  cloneRoadmapCurationData,
  curationFromLinearLayout,
  linearConceptLayoutEditor,
  linearLayoutFromCuration,
  type LinearConceptLayout,
} from "@pps/core";

function linearFixture(partial: LinearConceptLayout): LinearConceptLayout {
  return partial;
}

describe("linear concept layout", () => {
  it("shifts along the stored spine", () => {
    const layout = linearFixture({
      degreeSlug: "lds",
      spine: ["algoritmos", "python", "poo"],
      branches: {},
      branchOwnerOverrides: {},
    });
    const editor = linearConceptLayoutEditor(layout);
    const result = editor.shift("python", -1);
    expect(result.isSuccess()).toBe(true);
    if (result.isFailure()) {
      return;
    }
    const layoutRead = linearLayoutFromCuration(result.curation);
    expect(layoutRead.isSuccess()).toBe(true);
    if (layoutRead.isSuccess()) {
      expect(layoutRead.layout.spine).toEqual(["python", "algoritmos", "poo"]);
    }
    const reopened = result.reopen();
    expect(reopened.isSuccess()).toBe(true);
    if (reopened.isSuccess()) {
      expect(reopened.layout.spine).toEqual(["python", "algoritmos", "poo"]);
      expect(reopened.canShift("python", 1)).toBe(true);
    }
  });

  it("moves a topic to a lateral under a spine owner", () => {
    const layout = linearFixture({
      degreeSlug: "lds",
      spine: ["algoritmos", "python"],
      branches: {},
      branchOwnerOverrides: {},
    });
    const editor = linearConceptLayoutEditor(layout);
    const result = editor.attachSide("algoritmos", "python");
    expect(result.isSuccess()).toBe(true);
    if (result.isFailure()) {
      return;
    }
    const layoutRead = linearLayoutFromCuration(result.curation);
    expect(layoutRead.isSuccess()).toBe(true);
    if (layoutRead.isSuccess()) {
      expect(layoutRead.layout.spine).toEqual(["algoritmos"]);
    }
    expect(result.curation.branches.algoritmos).toEqual(["python"]);
  });

  it("round-trips layout through curation wire format", () => {
    const layout = linearFixture({
      degreeSlug: "lds",
      spine: ["a", "b"],
      branches: { a: ["c"] },
      branchOwnerOverrides: { c: "a" },
    });
    const curation = curationFromLinearLayout(layout);
    const fromEditor = linearConceptLayoutEditor(layout).toCuration();
    expect(cloneRoadmapCurationData(fromEditor)).toEqual(cloneRoadmapCurationData(curation));
  });
});
