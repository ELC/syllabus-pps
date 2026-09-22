import { LocationArea } from "./kinds";

/** Index path: segment index in trunk or lane, then optional nested lane indices. */
export type TrunkPath = readonly number[];

export type ConceptLocation =
  | {
      readonly area: typeof LocationArea.Trunk;
      readonly path: TrunkPath;
      readonly segmentIndex: number;
      readonly title: string;
    }
  | {
      readonly area: typeof LocationArea.Lateral;
      readonly owner: string;
      readonly index: number;
      readonly title: string;
    };
