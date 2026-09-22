import { EditErrorCode } from "../errors";
import { EditCommandKind } from "../kinds";
import { insertConceptAfter, removeConceptFromPath } from "../mutate";
import type { ConceptSubgraph } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { allowed, blocked, type PromoteAdmissibility } from "./admissibility";
import type { PromoteToSpineCommand } from "./commands";
import { branchOwnerForConcept } from "./lateral";

export function planPromoteToSpine(
  subgraph: ValidatedConceptSubgraph,
  branchTitle: string,
  ownerTitle: string | undefined,
): PromoteAdmissibility {
  const owner = branchOwnerForConcept(subgraph, branchTitle) ?? ownerTitle;
  if (!owner) {
    return blocked({ code: EditErrorCode.NoBranchOwner });
  }

  return allowed({
    kind: EditCommandKind.PromoteToSpine,
    branchTitle,
    ownerTitle: owner,
  });
}

export function applyPromoteToSpine(
  subgraph: ValidatedConceptSubgraph,
  command: PromoteToSpineCommand,
): ValidatedConceptSubgraph {
  const owner = command.ownerTitle;
  if (!owner) {
    return subgraph;
  }

  const laterals = { ...subgraph.laterals };
  for (const [key, branches] of Object.entries(laterals)) {
    laterals[key] = branches.filter((title) => title !== command.branchTitle);
    if (laterals[key]!.length === 0) {
      delete laterals[key];
    }
  }

  const branchOwnerOverrides = { ...subgraph.meta.branchOwnerOverrides };
  delete branchOwnerOverrides[command.branchTitle];

  const trunk = insertConceptAfter(
    removeConceptFromPath(subgraph.trunk, command.branchTitle),
    owner,
    command.branchTitle,
  );

  const spinePromotions = subgraph.meta.spinePromotions.includes(command.branchTitle)
    ? subgraph.meta.spinePromotions
    : [...subgraph.meta.spinePromotions, command.branchTitle];

  return markValidated({
    ...subgraph,
    trunk,
    laterals,
    meta: {
      ...subgraph.meta,
      branchOwnerOverrides,
      spinePromotions,
    },
  });
}
