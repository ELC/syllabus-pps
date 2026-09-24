import { describe, expect, it } from "vitest";

import { canonicalStructuralEdgeDirection } from "@pps/core";
import { PageKind } from "@pps/core";

describe("canonicalStructuralEdgeDirection", () => {
  const kinds = new Map<string, PageKind>([
    ["LDS", PageKind.Degree],
    ["año 1", PageKind.Year],
    ["bases de datos", PageKind.Course],
  ]);

  it("keeps degree to year", () => {
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

  it("reverses year to degree", () => {
    expect(canonicalStructuralEdgeDirection("año 1", "LDS", kinds)).toEqual({
      source: "LDS",
      target: "año 1",
    });
  });
});
