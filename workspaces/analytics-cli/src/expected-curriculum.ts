import type { ExpectedCurriculum } from "./types";

/** Local CLI defaults; year→course mapping is derived from year pages at graph build time. */
export const expectedCurriculum = {
  contentDir: "../../content/pages",
  years: [],
} satisfies ExpectedCurriculum;
