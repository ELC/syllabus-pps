import type { RoadmapCuration } from "../../components/roadmap/curation";
import type { ConceptCurationOpResult } from "../../components/roadmap/concept-curation-op-types";
import { decodeCuration } from "../codec/decode";
import { encodeSubgraph } from "../codec/encode";
import type { ConceptSubgraph } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";

export function curationInput(subgraph: ValidatedConceptSubgraph): RoadmapCuration {
  return subgraph.meta.sourceCuration ?? encodeSubgraph(subgraph);
}

export function subgraphAfterCuration(
  fallback: ConceptSubgraph,
  curation: RoadmapCuration,
): ValidatedConceptSubgraph {
  const decoded = decodeCuration(curation);
  const base = decoded.outcome === "decoded" ? decoded.subgraph : fallback;

  return markValidated({
    ...base,
    meta: {
      ...base.meta,
      sourceCuration: curation,
    },
  });
}

export function applyCurationMutation(
  subgraph: ValidatedConceptSubgraph,
  mutate: (curation: RoadmapCuration) => RoadmapCuration | null,
): ValidatedConceptSubgraph {
  const next = mutate(curationInput(subgraph));
  if (!next) {
    return subgraph;
  }

  return subgraphAfterCuration(subgraph, next);
}

export function applyCurationOp(
  subgraph: ValidatedConceptSubgraph,
  run: (curation: RoadmapCuration) => ConceptCurationOpResult,
): ValidatedConceptSubgraph | { ok: false } {
  const result = run(curationInput(subgraph));
  if (!result.ok) {
    return { ok: false };
  }

  return subgraphAfterCuration(subgraph, result.curation);
}
