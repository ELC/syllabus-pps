import type { ConceptEditCommand } from "./commands";
import { EditCommandKind } from "../kinds";
import type { ValidatedConceptSubgraph } from "../validated";
import { applyAttachLateral } from "./lateral";
import { applyMergeFork } from "./merge";
import { applyPromoteToSpine } from "./promote";
import { applySeparate } from "./separate";
import { applyShift } from "./shift";

export function applyCommand(
  subgraph: ValidatedConceptSubgraph,
  command: ConceptEditCommand,
): ValidatedConceptSubgraph {
  switch (command.kind) {
    case EditCommandKind.Shift:
      return applyShift(subgraph, command);
    case EditCommandKind.Separate:
      return applySeparate(subgraph, command);
    case EditCommandKind.MergeFork:
      return applyMergeFork(subgraph, command);
    case EditCommandKind.PromoteToSpine:
      return applyPromoteToSpine(subgraph, command);
    case EditCommandKind.AttachLateral:
      return applyAttachLateral(subgraph, command);
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}
