import { describe, expect, it } from "vitest";

import { courseLabelDensityClass } from "../../../roadmap/src/components/roadmap/course-label-style";

describe("courseLabelDensityClass", () => {
  it("uses compact sizing for long materia titles", () => {
    expect(courseLabelDensityClass("programación i")).toBe("");
    expect(courseLabelDensityClass("introducción a la economía")).toBe("");
    expect(courseLabelDensityClass("optimización e investigación operativa")).toBe(
      "roadmap__course-label--compact-md",
    );
    expect(
      courseLabelDensityClass("arquitectura e ingeniería del software"),
    ).toBe("roadmap__course-label--compact-md");
    expect(
      courseLabelDensityClass(
        "administración infraestructura y ciberseguridad avanzada",
      ),
    ).toBe("roadmap__course-label--compact");
  });
});
