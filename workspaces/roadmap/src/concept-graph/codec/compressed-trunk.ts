import type { RoadmapCuration } from "../../components/roadmap/curation";
import { StorageMode } from "../kinds";

export function readCompressedTrunkTitles(curation: RoadmapCuration): readonly string[] {
  if ((curation.trunkSpine ?? []).length > 0) {
    return curation.trunkSpine!;
  }

  let best: string[] = [...curation.postMergeSpine];
  for (const lane of curation.parallelLanes) {
    if (lane.spine.length > best.length) {
      best = [...lane.spine];
    }
  }

  return best;
}

export function readStorageMode(curation: RoadmapCuration): StorageMode {
  if (curation.trunkSpine !== undefined && curation.trunkSpine.length === 0) {
    return StorageMode.ParallelOnly;
  }

  if ((curation.trunkSpine ?? []).length > 0) {
    return StorageMode.TrunkExplicit;
  }

  return StorageMode.ParallelOnly;
}
