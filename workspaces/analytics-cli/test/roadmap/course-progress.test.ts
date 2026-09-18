import { describe, expect, it } from "vitest";

import {
  deriveCourseProgress,
  deriveConceptProgress,
  tallyStatuses,
  type RoadmapConceptProgress,
} from "../../../roadmap/src/components/roadmap/progress";

describe("deriveCourseProgress", () => {
  const conceptProgressFor = (title: string): RoadmapConceptProgress => {
    switch (title) {
      case "algoritmos":
        return { status: "done", done: 2, skipped: 0, total: 2, percent: 100 };
      case "estructuras":
        return { status: "pending", done: 1, skipped: 0, total: 2, percent: 50 };
      case "recursion":
        return { status: "skipped", done: 0, skipped: 2, total: 2, percent: 0 };
      default:
        return { status: "pending", done: 0, skipped: 0, total: 0, percent: 0 };
    }
  };

  it("marks a course done only when every concept is done", () => {
    expect(
      deriveCourseProgress(["algoritmos", "estructuras"], conceptProgressFor).status,
    ).toBe("pending");

    expect(deriveCourseProgress(["algoritmos"], conceptProgressFor)).toMatchObject({
      status: "done",
      done: 1,
      total: 1,
      percent: 100,
    });
  });

  it("marks a course skipped when every concept is skipped", () => {
    expect(deriveCourseProgress(["recursion"], conceptProgressFor)).toMatchObject({
      status: "skipped",
      skipped: 1,
      total: 1,
    });
  });
});

describe("tallyStatuses", () => {
  it("counts done and skipped items", () => {
    expect(
      tallyStatuses(["a", "b", "c"], (title) =>
        title === "a" ? "done" : title === "b" ? "skipped" : "pending",
      ),
    ).toEqual({ done: 1, skipped: 1, total: 3 });
  });
});

describe("deriveConceptProgress", () => {
  it("marks a concept done when all resources are done or skipped", () => {
    expect(
      deriveConceptProgress([1, 2], {
        "1": "done",
        "2": "skipped",
      }),
    ).toMatchObject({ status: "done", percent: 100 });
  });
});
