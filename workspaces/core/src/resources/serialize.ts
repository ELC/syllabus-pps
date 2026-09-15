import { CslDate, CslName, ResourceCatalogEntry } from "./types";

const ENTRY_KEYS: Array<keyof ResourceCatalogEntry> = [
  "id",
  "type",
  "title",
  "author",
  "editor",
  "publisher",
  "container-title",
  "issued",
  "accessed",
  "URL",
  "DOI",
  "ISBN",
  "edition",
  "genre",
  "language",
];

function compactString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function compactName(name: CslName): CslName | undefined {
  const given = compactString(name.given);
  const family = compactString(name.family);
  const literal = compactString(name.literal);
  if (!given && !family && !literal) {
    return undefined;
  }

  const compacted: CslName = {};
  if (given) {
    compacted.given = given;
  }
  if (family) {
    compacted.family = family;
  }
  if (literal) {
    compacted.literal = literal;
  }
  return compacted;
}

function compactNames(names: CslName[] | undefined): CslName[] | undefined {
  if (!names) {
    return undefined;
  }

  const compacted = names
    .map(compactName)
    .filter((name): name is CslName => name !== undefined);
  return compacted.length > 0 ? compacted : undefined;
}

function compactDate(date: CslDate | undefined): CslDate | undefined {
  const raw = compactString(date?.raw);
  return raw ? { raw } : undefined;
}

function compactEdition(value: string | number | undefined): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    return compactString(value);
  }
  return undefined;
}

/** Drop empty optional fields so catalog files stay compact CSL-JSON. */
export function compactResourceCatalogEntry(entry: ResourceCatalogEntry): ResourceCatalogEntry {
  const compacted: ResourceCatalogEntry = {
    id: entry.id?.trim() ?? "",
    type: entry.type,
    title: entry.title?.trim() ?? "",
  };

  const author = compactNames(entry.author);
  if (author) {
    compacted.author = author;
  }

  const editor = compactNames(entry.editor);
  if (editor) {
    compacted.editor = editor;
  }

  const publisher = compactString(entry.publisher);
  if (publisher) {
    compacted.publisher = publisher;
  }

  const containerTitle = compactString(entry["container-title"]);
  if (containerTitle) {
    compacted["container-title"] = containerTitle;
  }

  const issued = compactDate(entry.issued);
  if (issued) {
    compacted.issued = issued;
  }

  const accessed = compactDate(entry.accessed);
  if (accessed) {
    compacted.accessed = accessed;
  }

  const url = compactString(entry.URL);
  if (url) {
    compacted.URL = url;
  }

  const doi = compactString(entry.DOI);
  if (doi) {
    compacted.DOI = doi;
  }

  const isbn = compactString(entry.ISBN);
  if (isbn) {
    compacted.ISBN = isbn;
  }

  const edition = compactEdition(entry.edition);
  if (edition !== undefined) {
    compacted.edition = edition;
  }

  const genre = compactString(entry.genre);
  if (genre) {
    compacted.genre = genre;
  }

  const language = compactString(entry.language);
  if (language) {
    compacted.language = language;
  }

  return compacted;
}

function orderedEntry(entry: ResourceCatalogEntry): ResourceCatalogEntry {
  const ordered: ResourceCatalogEntry = {
    id: entry.id,
    type: entry.type,
    title: entry.title,
  };

  for (const key of ENTRY_KEYS) {
    if (key === "id" || key === "type" || key === "title") {
      continue;
    }
    if (entry[key] !== undefined) {
      (ordered as unknown as Record<string, unknown>)[key] = entry[key];
    }
  }

  return ordered;
}

export function serializeResourceCatalogJson(entries: ResourceCatalogEntry[]): string {
  const payload = entries.map((entry) => orderedEntry(compactResourceCatalogEntry(entry)));
  return `${JSON.stringify(payload, null, 2)}\n`;
}
