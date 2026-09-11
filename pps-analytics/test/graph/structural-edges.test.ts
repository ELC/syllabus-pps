import { describe, expect, it } from "vitest";

import { canonicalStructuralEdgeDirection } from "../../../packages/pps-core/src/graph/build";
import type { PageKind } from "../../../packages/pps-core/src/types";

describe("canonicalStructuralEdgeDirection", () => {
  const kinds = new Map<string, PageKind>([
    ["LDS", "career"],
    ["año 1", "year"],
    ["bases de datos", "course"],
  ]);

  it("keeps career to year", () => {
    expect(canonicalStructuralEdgeDirection("LDS", "año 1", kinds)).toEqual({
      source: "LDS",
      target: "año 1",
    });
  });

  it("keeps year to course", () => {
    expect(canonicalStructuralEdgeDirection("año 1", "bases de datos", kinds)).toEqual({
      source: "año 1",
      target: "bases de datos",
    });
  });

  it("reverses course to year", () => {
    expect(canonicalStructuralEdgeDirection("bases de datos", "año 1", kinds)).toEqual({
      source: "año 1",
      target: "bases de datos",
    });
  });

  it("reverses year to career", () => {
    expect(canonicalStructuralEdgeDirection("año 1", "LDS", kinds)).toEqual({
      source: "LDS",
      target: "año 1",
    });
  });
});
