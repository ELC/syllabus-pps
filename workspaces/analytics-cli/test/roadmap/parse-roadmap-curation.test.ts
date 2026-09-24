import {
  parseRoadmapCurationDocument,
  ParseRoadmapCurationInvalidReason,
  ResultKind,
} from "@pps/core";
import { describe, expect, it } from "vitest";

const sample = {
  degreeSlug: "lds",
  parallelLanes: [{ root: "a", spine: ["a", "b"] }],
  branches: {},
  branchOwnerOverrides: {},
};

describe("parseRoadmapCurationDocument", () => {
  it("parses a valid document", () => {
    const outcome = parseRoadmapCurationDocument(structuredClone(sample));
    expect(outcome.isSuccess()).toBe(true);
    if (outcome.isSuccess()) {
      expect(outcome.curation.degreeSlug).toBe("lds");
    }
  });

  it("rejects non-objects", () => {
    const outcome = parseRoadmapCurationDocument(null);
    expect(outcome.isFailure()).toBe(true);
    if (outcome.isFailure()) {
      expect(outcome.kind).toBe(ResultKind.Failure);
      expect(outcome.reason).toBe(ParseRoadmapCurationInvalidReason.NotObject);
    }
  });
});
