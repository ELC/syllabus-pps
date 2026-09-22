import { GraphNodeKind } from "./kinds";
import type { ConceptEditCommand } from "./editor/commands";
import { Admissibility } from "./kinds";
import type { CommandAdmissibility } from "./editor/admissibility";
import type { ValidatedConceptSubgraph } from "./validated";
import { planAttachLateral } from "./editor/lateral";
import { planMergeFork } from "./editor/merge";
import { planPromoteToSpine } from "./editor/promote";
import { planSeparate } from "./editor/separate";
import { planShift } from "./editor/shift";
import type { ShiftDirection } from "./kinds";
import { findConceptLocation } from "./traverse";
import { LocationArea } from "./kinds";

export type StartGraphNode = {
  readonly kind: typeof GraphNodeKind.Start;
};

export type TerminalGraphNode = {
  readonly kind: typeof GraphNodeKind.Terminal;
};

export type PrimaryGraphNode = {
  readonly kind: typeof GraphNodeKind.Primary;
  readonly title: string;
  readonly shiftUp: CommandAdmissibility;
  readonly shiftDown: CommandAdmissibility;
  readonly separateFrom: (otherTitle: string) => CommandAdmissibility;
  readonly mergeFork: CommandAdmissibility;
  readonly attachLateralTarget: (branchTitle: string) => CommandAdmissibility;
};

export type SecondaryGraphNode = {
  readonly kind: typeof GraphNodeKind.Secondary;
  readonly title: string;
  readonly promoteToSpine: CommandAdmissibility;
};

export type ForkGraphNode = {
  readonly kind: typeof GraphNodeKind.Fork;
  readonly anchorTitle: string;
};

export type JoinGraphNode = {
  readonly kind: typeof GraphNodeKind.Join;
  readonly anchorTitle: string;
};

export type ConceptGraphNode =
  | StartGraphNode
  | TerminalGraphNode
  | PrimaryGraphNode
  | SecondaryGraphNode
  | ForkGraphNode
  | JoinGraphNode;

export function resolvePrimaryGraphNode(
  subgraph: ValidatedConceptSubgraph,
  title: string,
): PrimaryGraphNode {
  return {
    kind: GraphNodeKind.Primary,
    title,
    shiftUp: planShift(subgraph, title, -1),
    shiftDown: planShift(subgraph, title, 1),
    separateFrom: (otherTitle: string) => planSeparate(subgraph, title, otherTitle),
    mergeFork: planMergeFork(subgraph, title),
    attachLateralTarget: (branchTitle: string) =>
      planAttachLateral(subgraph, title, branchTitle),
  };
}

export function resolveSecondaryGraphNode(
  subgraph: ValidatedConceptSubgraph,
  title: string,
  ownerTitle: string | undefined,
): SecondaryGraphNode {
  return {
    kind: GraphNodeKind.Secondary,
    title,
    promoteToSpine: planPromoteToSpine(subgraph, title, ownerTitle),
  };
}

export function resolveConceptGraphNode(
  subgraph: ValidatedConceptSubgraph,
  title: string,
  ownerTitle: string | undefined,
): ConceptGraphNode {
  const location = findConceptLocation(subgraph, title);
  if (location?.area === LocationArea.Lateral) {
    return resolveSecondaryGraphNode(subgraph, title, ownerTitle);
  }

  return resolvePrimaryGraphNode(subgraph, title);
}

export function primaryShiftCommand(
  node: PrimaryGraphNode,
  direction: ShiftDirection,
): ConceptEditCommand | undefined {
  const admissibility = direction === -1 ? node.shiftUp : node.shiftDown;
  if (admissibility.admissibility === Admissibility.Blocked) {
    return undefined;
  }

  return admissibility.command;
}
