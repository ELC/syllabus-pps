import type { CslItemType, CslName, ResourceCatalogEntry } from "@pps/core";
import { cslItemTypes } from "@pps/core";

export const TYPE_LABELS: Record<CslItemType, string> = {
  article: "Article",
  book: "Book",
  chapter: "Chapter",
  motion_picture: "Video",
  "paper-conference": "Conference paper",
  report: "Report",
  software: "Software",
  webpage: "Webpage",
};

export function todayRawDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyName(): CslName {
  return { given: "", family: "", literal: "" };
}

export function namesForForm(names: CslName[] | undefined): CslName[] {
  if (!names || names.length === 0) {
    return [emptyName()];
  }
  return names.map((name) => ({
    given: name.given ?? "",
    family: name.family ?? "",
    literal: name.literal ?? "",
  }));
}

export function nextDraftId(entries: ResourceCatalogEntry[]): string {
  const ids = new Set(entries.map((entry) => entry.id));
  if (!ids.has("new-resource")) {
    return "new-resource";
  }

  let index = 2;
  while (ids.has(`new-resource-${index}`)) {
    index += 1;
  }
  return `new-resource-${index}`;
}

export function createDraftEntry(entries: ResourceCatalogEntry[]): ResourceCatalogEntry {
  const today = todayRawDate();
  return {
    id: nextDraftId(entries),
    type: "webpage",
    title: "",
    author: [emptyName()],
    editor: [emptyName()],
    publisher: "",
    "container-title": "",
    issued: { raw: today },
    accessed: { raw: today },
    URL: "",
    DOI: "",
    ISBN: "",
    edition: "",
    genre: "",
    language: "",
  };
}

export function entryForForm(entry: ResourceCatalogEntry): ResourceCatalogEntry {
  return {
    id: entry.id ?? "",
    type: cslItemTypes.includes(entry.type) ? entry.type : "webpage",
    title: entry.title ?? "",
    author: namesForForm(entry.author),
    editor: namesForForm(entry.editor),
    publisher: entry.publisher ?? "",
    "container-title": entry["container-title"] ?? "",
    issued: { raw: entry.issued?.raw ?? "" },
    accessed: { raw: entry.accessed?.raw ?? "" },
    URL: entry.URL ?? "",
    DOI: entry.DOI ?? "",
    ISBN: entry.ISBN ?? "",
    edition: entry.edition === undefined ? "" : String(entry.edition),
    genre: entry.genre ?? "",
    language: entry.language ?? "",
  };
}
