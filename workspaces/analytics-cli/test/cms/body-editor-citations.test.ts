import { describe, expect, it } from "vitest";

import {
  resourceCitationIdAtOffset,
  segmentBodyWithResourceCitations,
} from "../../../cms/src/body-editor-citations";

describe("segmentBodyWithResourceCitations", () => {
  it("splits prose and [@id] citations", () => {
    const segments = segmentBodyWithResourceCitations(
      "- explicación [@algoritmo] y más [@asymptotic-notation]",
    );
    expect(segments).toEqual([
      { kind: "text", text: "- explicación " },
      {
        kind: "citation",
        id: "algoritmo",
        raw: "[@algoritmo]",
        start: 14,
        end: 26,
      },
      { kind: "text", text: " y más " },
      {
        kind: "citation",
        id: "asymptotic-notation",
        raw: "[@asymptotic-notation]",
        start: 32,
        end: 54,
      },
    ]);
  });
});

describe("resourceCitationIdAtOffset", () => {
  it("returns the id when the offset is inside a citation", () => {
    const body = "texto [@programacion-i] fin";
    expect(resourceCitationIdAtOffset(body, 8)).toBe("programacion-i");
  });

  it("returns null outside citations", () => {
    const body = "texto [@programacion-i] fin";
    expect(resourceCitationIdAtOffset(body, 0)).toBeNull();
  });
});
