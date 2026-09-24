import type { RoadmapCuration } from "./curation";
import type { LinearConceptLayout, LinearLayoutRead } from "./layout-types";
import { readLinearLayout } from "./linear-layout-editor";

export type { LinearConceptLayout } from "./layout-types";
export type { LinearConceptLayoutEditor } from "./linear-layout-editor";
export {
  linearConceptLayoutEditor,
  openLinearConceptLayout,
  readLinearLayout,
} from "./linear-layout-editor";
export {
  curationFromLinearLayout,
  expandedLinearLayoutOrder,
  layoutFromCurationFields,
} from "./linear-layout-persistence";

/** Same as {@link RoadmapCuration.open}().{@link readLinearLayout} (no null/undefined sentinel). */
export function linearLayoutFromCuration(curation: RoadmapCuration): LinearLayoutRead {
  return readLinearLayout(curation);
}
