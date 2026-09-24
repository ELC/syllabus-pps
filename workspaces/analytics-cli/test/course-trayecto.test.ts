import { describe, expect, it } from "vitest";

import {
  buildGraphFromPages,
  COURSE_TRAYECTO_NO_ESTRUCTURADO,
  COURSE_TRAYECTO_PRINCIPAL,
  createLoadedConfig,
  DEFAULT_COURSE_TRAYECTO,
  exportToCytoscape,
  PageKind,
  isTrayectoNoEstructurado,
  parseCourseTrayectoValue,
  resolveCourseTrayecto,
} from "@pps/core";

describe("parseCourseTrayectoValue", () => {
  it("accepts canonical trayecto labels", () => {
    expect(parseCourseTrayectoValue(COURSE_TRAYECTO_PRINCIPAL)).toBe(COURSE_TRAYECTO_PRINCIPAL);
    expect(parseCourseTrayectoValue(COURSE_TRAYECTO_NO_ESTRUCTURADO)).toBe(
      COURSE_TRAYECTO_NO_ESTRUCTURADO,
    );
  });

  it("maps legacy frontmatter aliases", () => {
    expect(parseCourseTrayectoValue("no-estructurado")).toBe(COURSE_TRAYECTO_NO_ESTRUCTURADO);
    expect(parseCourseTrayectoValue("principal")).toBe(COURSE_TRAYECTO_PRINCIPAL);
  });
});

describe("isTrayectoNoEstructurado", () => {
  it("matches canonical and legacy trayecto values", () => {
    expect(isTrayectoNoEstructurado(COURSE_TRAYECTO_NO_ESTRUCTURADO)).toBe(true);
    expect(isTrayectoNoEstructurado("no-estructurado")).toBe(true);
    expect(isTrayectoNoEstructurado(COURSE_TRAYECTO_PRINCIPAL)).toBe(false);
  });
});

describe("resolveCourseTrayecto", () => {
  it("defaults course pages to trayecto principal", () => {
    expect(resolveCourseTrayecto(PageKind.Course)).toBe(DEFAULT_COURSE_TRAYECTO);
  });

  it("defaults non-course pages to trayecto principal", () => {
    expect(resolveCourseTrayecto(PageKind.Concept)).toBe(DEFAULT_COURSE_TRAYECTO);
  });
});

describe("exportToCytoscape trayecto", () => {
  it("exports default trayecto principal for course nodes", () => {
    const config = createLoadedConfig({ years: [] });
    const graph = buildGraphFromPages({
      config,
      sources: [
        {
          path: "programacion-i.md",
          content: `---
title: programación i
kind: course
---
- intro
`,
        },
      ],
      resources: [],
    });

    const exported = exportToCytoscape(graph);
    expect(exported.elements.nodes[0]?.data.trayecto).toBe(COURSE_TRAYECTO_PRINCIPAL);
  });
});
