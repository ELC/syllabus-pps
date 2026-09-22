import { EditErrorCode } from "../errors";
import { EditCommandKind } from "../kinds";
import { removeConceptFromPath } from "../mutate";
import type { ConceptSubgraph } from "../subgraph";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { findConceptLocation } from "../traverse";
import { allowed, blocked, type AttachLateralAdmissibility } from "./admissibility";
import type { AttachLateralCommand } from "./commands";
import { isParallelSegment } from "../traverse";

export function planAttachLateral(
  subgraph: ValidatedConceptSubgraph,
  ownerTitle: string,
  branchTitle: string,
): AttachLateralAdmissibility {
  if (ownerTitle === branchTitle) {
    return blocked({ code: EditErrorCode.NoBranchOwner });
  }

  for (const segment of subgraph.trunk) {
    if (isParallelSegment(segment) && segment.after === branchTitle) {
      return blocked({ code: EditErrorCode.SideBlockedForkAnchor });
    }
  }

  return allowed({
    kind: EditCommandKind.AttachLateral,
    ownerTitle,
    branchTitle,
  });
}

export function applyAttachLateral(
  subgraph: ValidatedConceptSubgraph,
  command: AttachLateralCommand,
): ValidatedConceptSubgraph {
  const trunk = removeConceptFromPath(subgraph.trunk, command.branchTitle);
  const laterals = { ...subgraph.laterals };
  const existing = laterals[command.ownerTitle] ?? [];
  if (!existing.includes(command.branchTitle)) {
    laterals[command.ownerTitle] = [...existing, command.branchTitle];
  }

  const branchOwnerOverrides = {
    ...subgraph.meta.branchOwnerOverrides,
    [command.branchTitle]: command.ownerTitle,
  };

  branchOwnerOverrides[command.branchTitle] = command.ownerTitle;

  return markValidated({
    ...subgraph,
    trunk,
    laterals,
    meta: {
      ...subgraph.meta,
      branchOwnerOverrides,
    },
  });
}

export function branchOwnerForConcept(
  subgraph: ConceptSubgraph,
  title: string,
): string | undefined {
  if (subgraph.meta.branchOwnerOverrides[title]) {
    return subgraph.meta.branchOwnerOverrides[title];
  }

  for (const [owner, branches] of Object.entries(subgraph.laterals)) {
    if (branches.includes(title)) {
      return owner;
    }
  }

  return undefined;
}
