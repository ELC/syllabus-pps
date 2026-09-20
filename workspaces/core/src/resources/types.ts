/** CSL-JSON item types used in the PPS resource catalog. */
export const cslItemTypes = [
  "article",
  "book",
  "chapter",
  "motion_picture",
  "paper-conference",
  "report",
  "software",
  "webpage",
] as const;

export type CslItemType = (typeof cslItemTypes)[number];

export interface CslName {
  family?: string;
  given?: string;
  literal?: string;
}

/** Prefer `raw` (e.g. `"2019"` or `"2026-09-14"`). `date-parts` is legacy input only. */
export interface CslDate {
  raw?: string;
  "date-parts"?: number[][];
}

/** One catalog entry: CSL fields plus a stable kebab-case id. */
export interface ResourceCatalogEntry {
  id: string;
  type: CslItemType;
  title: string;
  author?: CslName[];
  editor?: CslName[];
  publisher?: string;
  "container-title"?: string;
  issued?: CslDate;
  accessed?: CslDate;
  URL?: string;
  /** Conference or event site; extension field (CSL has `event` for the name, not a URL). */
  "event-URL"?: string;
  DOI?: string;
  ISBN?: string;
  edition?: string | number;
  genre?: string;
  language?: string;
}

export interface ResourceCatalog {
  entries: ResourceCatalogEntry[];
}

export interface ResourceCatalogIndex {
  byId: ReadonlyMap<string, ResourceCatalogEntry>;
  byUrl: ReadonlyMap<string, ResourceCatalogEntry>;
}
