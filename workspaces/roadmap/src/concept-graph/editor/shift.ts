import { EditErrorCode } from "../errors";
import { Admissibility, ShiftDirection } from "../kinds";
import {
  canShiftConceptInOrder,
  shiftConceptInOrder,
} from "../../components/roadmap/concept-curation-legacy";
import { markValidated, type ValidatedConceptSubgraph } from "../validated";
import { blocked, type ShiftAdmissibility } from "./admissibility";
import type { ShiftCommand } from "./commands";
import { curationsStructurallyEqual } from "./curation-snapshot";
import { curationInput, subgraphAfterCuration } from "./curation-mutate";
import { applyShiftNative, planShiftNative } from "./shift-native";
import { titleOnCompressedTrunk } from "../traverse-expanded";
import { encodeSubgraph } from "../codec/encode";
import { sanitizeTrunkForkCuration } from "../../components/roadmap/concept-curation-sanitize";

function publishForCompare(subgraph: ValidatedConceptSubgraph) {
  const next = encodeSubgraph(subgraph);
  sanitizeTrunkForkCuration(next);
  return next;
}

function legacyDirection(direction: ShiftDirection): -1 | 1 {
  return direction === ShiftDirection.Up ? -1 : 1;
}

export function planShift(
  subgraph: ValidatedConceptSubgraph,
  title: string,
  direction: ShiftDirection,
): ShiftAdmissibility {
  const curation = curationInput(subgraph);
  if (!canShiftConceptInOrder(curation, title, legacyDirection(direction))) {
    return blocked({ code: EditErrorCode.ShiftNoNeighbor });
  }

  return planShiftNative(subgraph, title, direction);
}

export function applyShift(
  subgraph: ValidatedConceptSubgraph,
  command: ShiftCommand,
): ValidatedConceptSubgraph {
  const dir = legacyDirection(command.direction);
  const legacyNext = shiftConceptInOrder(
    structuredClone(curationInput(subgraph)),
    command.title,
    dir,
  );
  if (!legacyNext) {
    return subgraph;
  }

  const swapWith = command.swapWith;
  const canUseNativeShift =
    swapWith !== undefined &&
    titleOnCompressedTrunk(subgraph, command.title) &&
    titleOnCompressedTrunk(subgraph, swapWith);

  if (canUseNativeShift) {
    const nativeSubgraph = applyShiftNative(subgraph, command);
    const nativePublished = publishForCompare(nativeSubgraph);
    if (curationsStructurallyEqual(nativePublished, legacyNext)) {
      return markValidated({
        ...nativeSubgraph,
        meta: {
          ...nativeSubgraph.meta,
          sourceCuration: legacyNext,
        },
      });
    }
  }

  return subgraphAfterCuration(subgraph, legacyNext);
}
