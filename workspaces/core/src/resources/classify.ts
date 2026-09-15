import { CslItemType, ResourceCatalogEntry } from "./types";

export type CatalogSourceType =
  | "bibliography"
  | "documentation"
  | "article"
  | "video"
  | "course"
  | "reference";

/** UI and analytics resource kinds derived only from catalog metadata. */
export type CatalogResourceKind =
  | "video"
  | "book"
  | "wikipedia"
  | "interactive"
  | "course"
  | "documentation"
  | "article"
  | "text";

export function isBookResource(entry: ResourceCatalogEntry): boolean {
  return entry.type === "book" || entry.type === "chapter";
}

export function catalogResourceKind(entry: ResourceCatalogEntry): CatalogResourceKind {
  if (entry.type === "motion_picture") {
    return "video";
  }

  if (isBookResource(entry)) {
    return "book";
  }

  if (entry.type === "software") {
    return "documentation";
  }

  if (entry.type === "article" || entry.type === "paper-conference" || entry.type === "report") {
    return "article";
  }

  if (entry.genre === "course") {
    return "course";
  }

  if (entry.genre === "interactive") {
    return "interactive";
  }

  if (entry.publisher === "Wikimedia Foundation") {
    return "wikipedia";
  }

  return "text";
}

export function catalogSourceType(entry: ResourceCatalogEntry): CatalogSourceType {
  switch (catalogResourceKind(entry)) {
    case "video":
      return "video";
    case "book":
      return "bibliography";
    case "documentation":
      return "documentation";
    case "article":
      return "article";
    case "course":
      return "course";
    default:
      return "reference";
  }
}

export const panelResourceKinds = [
  "video",
  "wikipedia",
  "text",
  "book",
  "interactive",
] as const;

export type PanelResourceKind = (typeof panelResourceKinds)[number];

export const panelResourceLabels: Record<PanelResourceKind, string> = {
  video: "Video",
  wikipedia: "Wikipedia",
  text: "Texto",
  book: "Libro",
  interactive: "Interactivo",
};

/** Maps catalog kind to concept-panel icon categories. */
export function panelResourceKind(entry: ResourceCatalogEntry): PanelResourceKind {
  switch (catalogResourceKind(entry)) {
    case "video":
      return "video";
    case "book":
      return "book";
    case "wikipedia":
      return "wikipedia";
    case "interactive":
      return "interactive";
    default:
      return "text";
  }
}

export type { CslItemType };
