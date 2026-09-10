import { resolve } from "node:path";
import { createLoadedConfig, LoadedConfig } from "../../src/config";
import { buildGraph } from "../../src/graph";
import {
  CurriculumGraph,
  Diagnostic,
  DiagnosticSummary,
  ExpectedCurriculum,
} from "../../src/types";

export const FIXTURE_CONTENT_DIR = resolve("test/fixtures/content/pages");
export const FIXTURE_CONFIG_PATH = resolve("test/fixtures/pps.config.ts");
export const FIXTURE_GENERATED_AT = new Date("2026-01-01T00:00:00.000Z");
export const FIXTURE_GENERATED_AT_ISO = FIXTURE_GENERATED_AT.toISOString();

export const expectedCurriculum: ExpectedCurriculum = {
  years: [
    {
      title: "año 1",
      courses: ["algoritmos y estructuras de datos", "programación i"],
    },
  ],
};

export const expectedPageKinds: Array<[string, string]> = [
  ["algoritmos", "concept"],
  ["algoritmos y estructuras de datos", "course"],
  ["año 1", "year"],
  ["LDS", "career"],
  ["programación i", "course"],
];

export const expectedEdges: Array<[string, string, string]> = [
  ["algoritmos", "algoritmos", "page-ref"],
  ["algoritmos y estructuras de datos", "algoritmos", "concept-tag"],
  ["algoritmos y estructuras de datos", "algoritmos y estructuras de datos", "page-ref"],
  ["algoritmos y estructuras de datos", "programación i", "page-ref"],
  ["algoritmos y estructuras de datos", "programación i", "page-ref"],
  ["año 1", "algoritmos y estructuras de datos", "page-ref"],
  ["año 1", "año 1", "page-ref"],
  ["LDS", "algoritmos y estructuras de datos", "page-ref"],
  ["LDS", "año 1", "page-ref"],
  ["LDS", "LDS", "page-ref"],
  ["programación i", "algoritmos", "concept-tag"],
  ["programación i", "programación i", "page-ref"],
];

export const expectedDiagnosticSummaries: DiagnosticSummary[] = [
  {
    severity: "warning",
    code: "concept-low-course-coverage",
    page: "algoritmos",
  },
  {
    severity: "warning",
    code: "concept-note-without-source-link",
    page: "algoritmos",
  },
  {
    severity: "warning",
    code: "course-without-year-link",
    page: "programación i",
  },
  {
    severity: "warning",
    code: "self-link",
    page: "algoritmos",
  },
  {
    severity: "warning",
    code: "self-link",
    page: "algoritmos y estructuras de datos",
  },
  {
    severity: "warning",
    code: "self-link",
    page: "año 1",
  },
  {
    severity: "warning",
    code: "self-link",
    page: "LDS",
  },
  {
    severity: "warning",
    code: "self-link",
    page: "programación i",
  },
  {
    severity: "warning",
    code: "uuid-ref-resolved",
    page: "algoritmos y estructuras de datos",
  },
];

export function fixtureConfig(): LoadedConfig {
  return createLoadedConfig(expectedCurriculum, { contentDir: FIXTURE_CONTENT_DIR });
}

export function buildFixtureGraph(): CurriculumGraph {
  return buildGraph({
    contentDir: FIXTURE_CONTENT_DIR,
    config: fixtureConfig(),
    generatedAt: FIXTURE_GENERATED_AT_ISO,
  });
}

export function summarizeDiagnostics(diagnostics: Diagnostic[]): DiagnosticSummary[] {
  return diagnostics.map(({ severity, code, page }) => {
    if (page === undefined) {
      throw new Error(`Expected diagnostic page for code "${code}"`);
    }

    return { severity, code, page };
  });
}
