import {
  Admissibility,
  ShiftDirection,
  applyCommand,
  assertCurationInvariants,
  assertEditPreservesTopics,
  decodeCuration,
  encodeSubgraph,
} from "../../concept-graph";
import { curationsStructurallyEqual } from "../../concept-graph/editor/curation-snapshot";
import { planShift } from "../../concept-graph/editor/shift";
import { markValidated, type ValidatedConceptSubgraph } from "../../concept-graph/validated";
import { EditErrorCode, type EditError } from "../../concept-graph/errors";
import { planAttachLateral } from "../../concept-graph/editor/lateral";
import { planMergeFork } from "../../concept-graph/editor/merge";
import { planPromoteToSpine } from "../../concept-graph/editor/promote";
import { replacePathAt } from "../../concept-graph/mutate";
import { conceptSegment, type SpinePath } from "../../concept-graph/segment";
import { isConceptSegment } from "../../concept-graph/traverse";
import { findSpinePathContextForTitles } from "../../concept-graph/editor/path-context";
import type { RoadmapCuration } from "./curation";
import {
  mergeTrunkFork as mergeTrunkForkLegacy,
  separateSpineRangeToBranches as separateSpineRangeToBranchesLegacy,
  shiftConceptInOrder as shiftConceptInOrderLegacy,
} from "./concept-curation-legacy";
import { sanitizeTrunkForkCuration } from "./concept-curation-sanitize";
import type {
  ConceptCurationOpError,
  ConceptCurationOpResult,
} from "./concept-curation-op-types";

const GRAPH_OP_ERRORS = new Set<string>([
  EditErrorCode.NoBranchOwner,
  EditErrorCode.NoSpineAnchor,
  EditErrorCode.SeparateNotOnSpine,
  EditErrorCode.SeparateNoNeighbors,
  EditErrorCode.SeparateSameNode,
  EditErrorCode.SeparateDifferentLists,
  EditErrorCode.ForkLaneNotFound,
  EditErrorCode.MergeForkNotFound,
  EditErrorCode.MergeForkPickLane,
  EditErrorCode.SideBlockedMergeJoin,
  EditErrorCode.SideBlockedForkAnchor,
]);

function toOpError(error: EditError): ConceptCurationOpError {
  if (GRAPH_OP_ERRORS.has(error.code)) {
    return error.code as ConceptCurationOpError;
  }

  return EditErrorCode.SeparateNotOnSpine;
}

type Decoded =
  | { ok: true; subgraph: ValidatedConceptSubgraph }
  | { ok: false; error: ConceptCurationOpError };

function decodeOrFail(curation: RoadmapCuration): Decoded {
  const decoded = decodeCuration(curation);
  if (decoded.outcome !== "decoded") {
    return { ok: false, error: EditErrorCode.CodecInvalidCuration as ConceptCurationOpError };
  }

  return {
    ok: true,
    subgraph: markValidated({
      ...decoded.subgraph,
      meta: { ...decoded.subgraph.meta, sourceCuration: curation },
    }),
  };
}

function withoutSourceCuration(
  subgraph: ValidatedConceptSubgraph,
): ValidatedConceptSubgraph {
  return markValidated({
    ...subgraph,
    meta: { ...subgraph.meta, sourceCuration: undefined },
  });
}

function publish(
  subgraph: ValidatedConceptSubgraph,
  editSource?: RoadmapCuration,
): RoadmapCuration {
  if (subgraph.meta.sourceCuration) {
    const next = structuredClone(subgraph.meta.sourceCuration);
    sanitizeTrunkForkCuration(next);
    if (editSource) {
      assertEditPreservesTopics(editSource, next);
    }
    assertCurationInvariants(next);
    return next;
  }

  const next = encodeSubgraph(subgraph);
  sanitizeTrunkForkCuration(next);
  if (editSource) {
    assertEditPreservesTopics(editSource, next);
  }
  assertCurationInvariants(next);
  return next;
}

function pathIsLinearConcepts(path: SpinePath): boolean {
  return path.every((segment) => isConceptSegment(segment));
}

function orderToLinearPath(order: readonly string[]): SpinePath {
  return order.map((title) => conceptSegment(title));
}

export function separateSpineRangeToBranches(
  curation: RoadmapCuration,
  firstSelectedTitle: string,
  lastSelectedTitle: string,
): ConceptCurationOpResult {
  return separateSpineRangeToBranchesLegacy(
    curation,
    firstSelectedTitle,
    lastSelectedTitle,
  );
}

export function mergeTrunkFork(
  curation: RoadmapCuration,
  conceptTitle: string,
): ConceptCurationOpResult {
  const legacyResult = mergeTrunkForkLegacy(curation, conceptTitle);

  const decoded = decodeOrFail(curation);
  if (!decoded.ok) {
    return legacyResult;
  }

  const plan = planMergeFork(decoded.subgraph, conceptTitle);
  if (plan.admissibility === Admissibility.Blocked) {
    return legacyResult.ok ? legacyResult : { ok: false, error: toOpError(plan.error) };
  }

  try {
    const nextSubgraph = withoutSourceCuration(
      applyCommand(decoded.subgraph, plan.command),
    );
    const next = publish(nextSubgraph, curation);
    if (
      next.trunkForks === undefined &&
      (curation.trunkForks?.length ?? 0) > 0
    ) {
      next.trunkForks = [];
    }

    return { ok: true, curation: next };
  } catch {
    return legacyResult.ok
      ? legacyResult
      : { ok: false, error: EditErrorCode.MergeForkNotFound as ConceptCurationOpError };
  }
}

export function shiftConceptInOrder(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
): RoadmapCuration | null {
  const next = shiftConceptInOrderLegacy(structuredClone(curation), title, direction);
  if (!next || curationsStructurallyEqual(curation, next)) {
    return null;
  }

  return next;
}

export function canShiftConceptInOrder(
  curation: RoadmapCuration,
  title: string,
  direction: -1 | 1,
): boolean {
  const decoded = decodeOrFail(curation);
  if (!decoded.ok) {
    return false;
  }

  const shiftDirection =
    direction === -1 ? ShiftDirection.Up : ShiftDirection.Down;
  return planShift(decoded.subgraph, title, shiftDirection).admissibility ===
    Admissibility.Allowed;
}

export function swapConceptOrder(
  curation: RoadmapCuration,
  leftTitle: string,
  rightTitle: string,
): RoadmapCuration | null {
  if (leftTitle === rightTitle) {
    return curation;
  }

  const decoded = decodeOrFail(curation);
  if (!decoded.ok) {
    return null;
  }

  const context = findSpinePathContextForTitles(
    decoded.subgraph,
    leftTitle,
    rightTitle,
  );
  if (!context || !pathIsLinearConcepts(context.path)) {
    return null;
  }

  const leftIndex = context.order.indexOf(leftTitle);
  const rightIndex = context.order.indexOf(rightTitle);
  if (leftIndex < 0 || rightIndex < 0) {
    return null;
  }

  const swapped = [...context.order];
  swapped[leftIndex] = rightTitle;
  swapped[rightIndex] = leftTitle;

  const nextPath = orderToLinearPath(swapped);
  const trunk =
    context.pathIndices.length === 0
      ? nextPath
      : replacePathAt(decoded.subgraph.trunk, context.pathIndices, nextPath);

  return publish(
    withoutSourceCuration(
      markValidated({ ...decoded.subgraph, trunk }),
    ),
    curation,
  );
}

export function promoteConceptToSpine(
  curation: RoadmapCuration,
  branchTitle: string,
  options?: { ownerTitle?: string; insertAfterTitle?: string },
): ConceptCurationOpResult {
  const decoded = decodeOrFail(curation);
  if (!decoded.ok) {
    return decoded;
  }

  const plan = planPromoteToSpine(
    decoded.subgraph,
    branchTitle,
    options?.ownerTitle,
  );
  if (plan.admissibility === Admissibility.Blocked) {
    return { ok: false, error: toOpError(plan.error) };
  }

  const nextSubgraph = withoutSourceCuration(
    applyCommand(decoded.subgraph, plan.command),
  );
  return { ok: true, curation: publish(nextSubgraph, curation) };
}

export function attachSideConcept(
  curation: RoadmapCuration,
  ownerTitle: string,
  branchTitle: string,
): ConceptCurationOpResult {
  const decoded = decodeOrFail(curation);
  if (!decoded.ok) {
    return decoded;
  }

  const plan = planAttachLateral(decoded.subgraph, ownerTitle, branchTitle);
  if (plan.admissibility === Admissibility.Blocked) {
    return { ok: false, error: toOpError(plan.error) };
  }

  const nextSubgraph = withoutSourceCuration(
    applyCommand(decoded.subgraph, plan.command),
  );
  return { ok: true, curation: publish(nextSubgraph, curation) };
}
