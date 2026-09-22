import { encodeSubgraph } from "./codec/encode";
import { assertCurationInvariants } from "./invariants";
import type { ConceptSubgraph } from "./subgraph";
import { sanitizeTrunkForkCuration } from "../components/roadmap/concept-curation-sanitize";

declare const ValidatedConceptSubgraphBrand: unique symbol;

/** Subgraph that satisfied structural invariants at the last validation boundary. */
export type ValidatedConceptSubgraph = ConceptSubgraph & {
  readonly [ValidatedConceptSubgraphBrand]: true;
};

type MarkValidatedOptions = {
  readonly skipInvariantCheck?: boolean;
};

/** Attach the validated brand; optionally assert curation invariants on publish boundaries. */
export function markValidated(
  subgraph: ConceptSubgraph,
  options?: MarkValidatedOptions,
): ValidatedConceptSubgraph {
  if (!options?.skipInvariantCheck) {
    const curation = subgraph.meta.sourceCuration
      ? structuredClone(subgraph.meta.sourceCuration)
      : encodeSubgraph(subgraph as ValidatedConceptSubgraph);
    sanitizeTrunkForkCuration(curation);
    assertCurationInvariants(curation);
  }

  return subgraph as ValidatedConceptSubgraph;
}
