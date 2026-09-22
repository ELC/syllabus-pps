import type {
  RoadmapCapstone,
  RoadmapCuration,
  RoadmapTrunkFork,
} from "../components/roadmap/curation";
import type { StorageMode } from "./kinds";
import type { SpinePath } from "./segment";

export type LateralMap = Readonly<Record<string, readonly string[]>>;

export type TrunkSpineField = "absent" | "empty" | "titles";

export type ConceptSubgraphMeta = {
  readonly storageMode: StorageMode;
  /** How `trunkSpine` was stored on the curation blob (including parallel-only `[]`). */
  readonly trunkSpineField: TrunkSpineField;
  /** Inicio anchor for parallel-only layouts (may differ from spine[0] after reorder). */
  readonly parallelLaneRoot: string;
  readonly spinePromotions: readonly string[];
  readonly branchLayoutFlips: Readonly<Record<string, boolean>>;
  readonly capstones: readonly RoadmapCapstone[];
  readonly spineJoins: Readonly<Record<string, string>>;
  readonly branchOwnerOverrides: Readonly<Record<string, string>>;
  /** Trunk fork layout from the curation blob (shift expanded order until decode nests all forks). */
  readonly trunkForks?: readonly RoadmapTrunkFork[];
  /** Authoritative curation JSON when encode(decode) still drifts from legacy edits. */
  readonly sourceCuration?: RoadmapCuration;
};

export type ConceptSubgraph = {
  readonly degreeSlug: string;
  readonly trunk: SpinePath;
  readonly laterals: LateralMap;
  readonly meta: ConceptSubgraphMeta;
};
