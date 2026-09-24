import { describe, expect, it } from "vitest";

import { borderColorForYearIndex } from "../../../shell/src/austral-tokens";
import { courseDagEdgeStrokeColor } from "../../../roadmap/src/components/roadmap/build-flow";

describe("courseDagEdgeStrokeColor", () => {
  it("matches the source course año border color", () => {
    const years = new Map([
      ["programación i", "año 1"],
      ["bases de datos", "año 2"],
    ]);

    expect(courseDagEdgeStrokeColor("programación i", years)).toBe(borderColorForYearIndex(1));
    expect(courseDagEdgeStrokeColor("bases de datos", years)).toBe(borderColorForYearIndex(2));
  });
});
