import { buildCurriculumIndexes } from "../analysis/indexes";
import { collectConceptSources } from "../analysis/sources";
import { CurriculumGraph } from "../types";

export interface ConceptMapRow {
  concept: string;
  sourceType: string;
  source: string;
  line: string;
  note: string;
}

export function collectConceptMapRows(graph: CurriculumGraph): ConceptMapRow[] {
  const { curriculumTitles } = buildCurriculumIndexes(graph);

  return graph.pages
    .filter((page) => page.kind === "concept")
    .flatMap((page) => {
      const sources = collectConceptSources(page, curriculumTitles);

      if (sources.length === 0) {
        return [
          {
            concept: page.title,
            sourceType: "(missing)",
            source: "(missing)",
            line: "",
            note: "No source link found in concept page.",
          },
        ];
      }

      return sources.map((source) => ({
        concept: page.title,
        ...source,
      }));
    })
    .sort((a, b) => a.concept.localeCompare(b.concept, "es-AR"));
}
