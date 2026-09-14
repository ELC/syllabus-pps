import { hasCslDate } from "./dates";
import { CslDate, CslItemType, ResourceCatalogEntry, cslItemTypes } from "./types";

export interface ResourceValidationIssue {
  id?: string;
  field: string;
  message: string;
}

function hasNames(names: ResourceCatalogEntry["author"]): boolean {
  return Boolean(names && names.length > 0 && names.some((name) => name.literal || name.family || name.given));
}

function hasIssuedOrAccessed(entry: ResourceCatalogEntry): boolean {
  return hasCslDate(entry.issued) || hasCslDate(entry.accessed);
}

function validateDateField(id: string | undefined, field: "issued" | "accessed", date: CslDate | undefined): ResourceValidationIssue[] {
  if (!date) {
    return [];
  }

  const issues: ResourceValidationIssue[] = [];

  if (date["date-parts"]?.length) {
    issues.push({
      id,
      field,
      message: `${field} must use raw date string format, not date-parts.`,
    });
  }

  if (date.raw !== undefined && typeof date.raw !== "string") {
    issues.push({
      id,
      field,
      message: `${field}.raw must be a string.`,
    });
  }

  return issues;
}

function validateEntry(entry: ResourceCatalogEntry): ResourceValidationIssue[] {
  const issues: ResourceValidationIssue[] = [];
  const id = entry.id;

  if (!id || typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    issues.push({
      id,
      field: "id",
      message: "Resource id must be a non-empty kebab-case string.",
    });
  }

  if (!entry.type || !cslItemTypes.includes(entry.type as CslItemType)) {
    issues.push({
      id,
      field: "type",
      message: `Resource type must be one of: ${cslItemTypes.join(", ")}.`,
    });
  }

  if (!entry.title || typeof entry.title !== "string" || entry.title.trim().length === 0) {
    issues.push({ id, field: "title", message: "Resource title is required." });
  }

  if (!entry.URL || typeof entry.URL !== "string" || !/^https?:\/\//.test(entry.URL)) {
    issues.push({ id, field: "URL", message: "Resource URL must be an http(s) URL." });
  }

  issues.push(...validateDateField(id, "issued", entry.issued));
  issues.push(...validateDateField(id, "accessed", entry.accessed));

  switch (entry.type) {
    case "book":
      if (!hasNames(entry.author) && !hasNames(entry.editor)) {
        issues.push({ id, field: "author", message: "Book entries require author or editor." });
      }
      if (!entry.publisher) {
        issues.push({ id, field: "publisher", message: "Book entries require a publisher." });
      }
      if (!hasIssuedOrAccessed(entry)) {
        issues.push({ id, field: "issued", message: "Book entries require issued date." });
      }
      break;
    case "article":
    case "paper-conference":
    case "report":
      if (!hasNames(entry.author) && !entry.publisher) {
        issues.push({
          id,
          field: "author",
          message: `${entry.type} entries require author or publisher.`,
        });
      }
      if (!hasIssuedOrAccessed(entry)) {
        issues.push({ id, field: "issued", message: `${entry.type} entries require issued or accessed date.` });
      }
      break;
    case "motion_picture":
      if (!hasNames(entry.author)) {
        issues.push({ id, field: "author", message: "Video entries require author or channel." });
      }
      if (!hasIssuedOrAccessed(entry)) {
        issues.push({ id, field: "issued", message: "Video entries require issued or accessed date." });
      }
      break;
    case "webpage":
    case "software":
    case "chapter":
    default:
      if (!hasNames(entry.author) && !entry.publisher) {
        issues.push({
          id,
          field: "author",
          message: `${entry.type} entries require author or publisher.`,
        });
      }
      if (!hasIssuedOrAccessed(entry)) {
        issues.push({
          id,
          field: "issued",
          message: `${entry.type} entries require issued or accessed date.`,
        });
      }
      break;
  }

  return issues;
}

export function validateResourceCatalog(entries: ResourceCatalogEntry[]): void {
  const issues: ResourceValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const entry of entries) {
    const entryIssues = validateEntry(entry);
    issues.push(...entryIssues);

    if (entry.id) {
      if (seenIds.has(entry.id)) {
        issues.push({ id: entry.id, field: "id", message: `Duplicate resource id "${entry.id}".` });
      }
      seenIds.add(entry.id);
    }

    if (entry.URL) {
      const normalized = entry.URL.trim();
      if (seenUrls.has(normalized)) {
        issues.push({ id: entry.id, field: "URL", message: `Duplicate resource URL "${entry.URL}".` });
      }
      seenUrls.add(normalized);
    }
  }

  if (issues.length > 0) {
    const summary = issues
      .slice(0, 10)
      .map((issue) => `${issue.id ?? "?"}: ${issue.field} — ${issue.message}`)
      .join("\n");
    throw new Error(`Resource catalog validation failed (${issues.length} issue(s)):\n${summary}`);
  }
}

export function collectResourceCatalogIssues(entries: ResourceCatalogEntry[]): ResourceValidationIssue[] {
  const issues: ResourceValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const entry of entries) {
    issues.push(...validateEntry(entry));

    if (entry.id) {
      if (seenIds.has(entry.id)) {
        issues.push({ id: entry.id, field: "id", message: `Duplicate resource id "${entry.id}".` });
      }
      seenIds.add(entry.id);
    }

    if (entry.URL) {
      const normalized = entry.URL.trim();
      if (seenUrls.has(normalized)) {
        issues.push({ id: entry.id, field: "URL", message: `Duplicate resource URL "${entry.URL}".` });
      }
      seenUrls.add(normalized);
    }
  }

  return issues;
}
