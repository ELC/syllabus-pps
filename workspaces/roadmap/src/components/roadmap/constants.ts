export const ROADMAP_START_ID = "__roadmap_start__";
export const ROADMAP_END_ID = "__roadmap_end__";

export const SPINE_NODE_WIDTH = 236;
export const SPINE_NODE_HEIGHT = 64;
/** Course overview cards (fallback when CSS metrics are unavailable). */
export const COURSE_NODE_WIDTH = 250;
export const COURSE_NODE_HEIGHT = 92;
export const BRANCH_NODE_WIDTH = SPINE_NODE_WIDTH;
export const BRANCH_NODE_HEIGHT = SPINE_NODE_HEIGHT;
export const ANCHOR_NODE_WIDTH = 184;
export const ANCHOR_NODE_HEIGHT = 48;
/** Pointy-top regular hexagon: height = width * sqrt(3) / 2. */
export const BRANCH_COLUMN_GAP = 48;
export const BRANCH_ROW_GAP = 22;
/** Horizontal space between parallel lane spines. */
export const LANE_GAP = 300;
export const STAGE_GAP = 64;
export const ANCHOR_GAP = 72;
export const JUNCTION_NODE_SIZE = 18;
/** Minimum vertical drop before a spine fork turns horizontally. */
export const STEP_EDGE_OFFSET = 24;
/** Where fork runways sit within the source→target gap (higher = lower / more horizontal spread). */
export const JUNCTION_RUNWAY_RATIO = 0.5;

export const HANDLE_TOP_IN = "t-in";
export const HANDLE_BOTTOM_OUT = "b-out";
export const HANDLE_JUNCTION_IN = "j-in";
export const HANDLE_JUNCTION_IN_LEFT = "j-in-l";
export const HANDLE_JUNCTION_IN_RIGHT = "j-in-r";
export const HANDLE_JUNCTION_OUT_LEFT = "j-out-l";
export const HANDLE_JUNCTION_OUT_RIGHT = "j-out-r";
export const HANDLE_JUNCTION_OUT_BOTTOM = "j-out-b";
export const HANDLE_LEFT_IN = "l-in";
export const HANDLE_LEFT_OUT = "l-out";
export const HANDLE_RIGHT_IN = "r-in";
export const HANDLE_RIGHT_OUT = "r-out";
