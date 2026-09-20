import {
  courseTrayectos,
  parseCourseTrayectoValue,
  parseFrontmatter,
  pageKinds,
  stringifyPageSource,
  type CourseTrayecto,
  type PageKind,
} from "@pps/core";

const EDITOR_KINDS = pageKinds.filter((kind) => kind !== "unknown") as Exclude<PageKind, "unknown">[];

export type EditorPageKind = (typeof EDITOR_KINDS)[number];

export interface PageMetadata {
  title: string;
  slug: string;
  kind: EditorPageKind;
  version?: number;
  updatedAt?: string;
  /** Empty string means default (Trayecto Principal). */
  trayecto: CourseTrayecto | "";
  correlativas: string[];
  dependsOn: string[];
}

export { EDITOR_KINDS, courseTrayectos };

function parseKind(value: unknown): EditorPageKind {
  if (typeof value === "string" && EDITOR_KINDS.includes(value as EditorPageKind)) {
    return value as EditorPageKind;
  }
  return "concept";
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseTrayecto(value: unknown): CourseTrayecto | "" {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value !== "string") {
    return "";
  }
  return parseCourseTrayectoValue(value) ?? "";
}

export function defaultPageMetadata(slug: string): PageMetadata {
  return {
    title: slug.replace(/-/g, " "),
    slug,
    kind: "concept",
    version: 1,
    updatedAt: new Date().toISOString(),
    trayecto: "",
    correlativas: [],
    dependsOn: [],
  };
}

export function splitPageDocument(source: string, fileSlug: string): { metadata: PageMetadata; body: string } {
  const { data, content } = parseFrontmatter(source);
  const slug = typeof data.slug === "string" && data.slug.trim() ? data.slug.trim() : fileSlug;
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : slug.replace(/-/g, " ");

  const version = typeof data.version === "number" ? data.version : undefined;
  const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : undefined;

  return {
    metadata: {
      title,
      slug,
      kind: parseKind(data.kind),
      version,
      updatedAt,
      trayecto: parseTrayecto(data.trayecto),
      correlativas: parseStringList(data.correlativas),
      dependsOn: parseStringList(data.dependsOn),
    },
    body: content,
  };
}

export function composePageDocument(metadata: PageMetadata, body: string): string {
  const record: Record<string, unknown> = {
    title: metadata.title,
    slug: metadata.slug,
    kind: metadata.kind,
  };

  if (metadata.version !== undefined) {
    record.version = metadata.version;
  }
  if (metadata.updatedAt) {
    record.updatedAt = metadata.updatedAt;
  }

  if (metadata.kind === "course") {
    if (metadata.trayecto) {
      record.trayecto = metadata.trayecto;
    }
    if (metadata.correlativas.length > 0) {
      record.correlativas = metadata.correlativas;
    }
  }

  if (metadata.kind === "concept") {
    record.dependsOn = metadata.dependsOn;
  }

  return stringifyPageSource(record, body);
}
