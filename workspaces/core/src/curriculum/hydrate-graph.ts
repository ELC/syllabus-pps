import { CurriculumGraph } from "../types";
import { deriveExpectedCurriculum } from "./derive-expected";

/** Normalize artifacts loaded from Postgres (missing fields or stale expected). */
export function hydrateCurriculumGraph(graph: CurriculumGraph): CurriculumGraph {
  const pages = Array.isArray(graph.pages) ? graph.pages : [];
  const derivedYears = deriveExpectedCurriculum(pages).years;
  const storedYears = graph.expected?.years ?? [];

  return {
    ...graph,
    generatedAt: graph.generatedAt ?? new Date(0).toISOString(),
    pages,
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    resources: graph.resources ?? [],
    expected: {
      ...(graph.expected ?? { years: [] }),
      years: derivedYears.length > 0 ? derivedYears : storedYears,
    },
  };
}
