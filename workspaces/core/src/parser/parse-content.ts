import { normalizeTitle, stripMarkdownExtension } from "../normalize";
import { parseFrontmatter } from "./frontmatter";
import { slugFromPath } from "../slug";
import { parseCourseTrayectoValue } from "../course-trayecto";
import { CourseTrayecto, pageKinds, PageKind, ZettelBlock } from "../types";
import {
  extractCitationRefs,
  extractConceptTags,
  extractPageRefs,
  extractUrlLinks,
} from "./extractors";
import { RawPage } from "./types";

const VALID_KINDS = new Set<PageKind>(pageKinds);

function parseKind(value: unknown): PageKind | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return VALID_KINDS.has(value as PageKind) ? (value as PageKind) : undefined;
}

function parseTrayecto(value: unknown): {
  raw: unknown;
  trayecto?: CourseTrayecto;
  invalid?: boolean;
} {
  if (value === undefined) {
    return { raw: undefined };
  }

  if (typeof value !== "string") {
    return { raw: value, invalid: true };
  }

  const trayecto = parseCourseTrayectoValue(value);
  if (!trayecto) {
    return { raw: value, invalid: true };
  }

  return { raw: value, trayecto };
}

function parsePositiveIntField(value: unknown): { raw: unknown; value?: number; invalid?: boolean } {
  if (value === undefined) {
    return { raw: undefined };
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return { raw: value, invalid: true };
  }
  return { raw: value, value };
}

function parseStringListField(value: unknown): { raw: unknown; targets?: string[] } {
  if (value === undefined) {
    return { raw: undefined };
  }

  if (!Array.isArray(value)) {
    return { raw: value };
  }

  const targets: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      return { raw: value };
    }
    targets.push(item.trim());
  }

  return { raw: value, targets };
}

export function parsePageContent(source: { path: string; content: string }): RawPage {
  const parsed = parseFrontmatter(source.content);
  const fileSlug = slugFromPath(source.path);
  const slug = typeof parsed.data.slug === "string" ? parsed.data.slug.trim() : fileSlug;
  const titleFromFrontmatter =
    typeof parsed.data.title === "string" ? parsed.data.title.trim() : undefined;
  const title =
    titleFromFrontmatter ??
    stripMarkdownExtension(source.path.split(/[/\\]/).pop() ?? source.path).normalize("NFC");
  const normalizedTitle = normalizeTitle(title);
  const id = typeof parsed.data.id === "string" ? parsed.data.id.trim() : undefined;
  const frontmatterKind = parseKind(parsed.data.kind);
  const dependsOn = parseStringListField(parsed.data.dependsOn);
  const correlativas = parseStringListField(parsed.data.correlativas);
  const courses = parseStringListField(parsed.data.courses);
  const yearsCount = parsePositiveIntField(parsed.data.years);
  const yearIndex = parsePositiveIntField(parsed.data.yearIndex);
  const degreeRaw = parsed.data.degree;
  const degreeTarget =
    typeof degreeRaw === "string" && degreeRaw.trim().length > 0 ? degreeRaw.trim() : undefined;
  const degreeInvalid = degreeRaw !== undefined && degreeTarget === undefined;
  const trayecto = parseTrayecto(parsed.data.trayecto);
  const blocks: ZettelBlock[] = [];
  const nonBulletLines: number[] = [];

  parsed.content.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const blockMatch = line.match(/^\s*-\s+(.*)$/);
    if (!blockMatch) {
      nonBulletLines.push(lineNumber);
      return;
    }

    const text = blockMatch[1] ?? "";
    blocks.push({
      line: lineNumber,
      text,
      refs: extractPageRefs(text, lineNumber),
      tags: extractConceptTags(text, lineNumber),
      urls: extractUrlLinks(text, lineNumber),
      citations: extractCitationRefs(text, lineNumber),
    });
  });

  return {
    id,
    slug,
    title,
    normalizedTitle,
    path: source.path.replace(/\\/g, "/"),
    frontmatterKind,
    dependsOnRaw: dependsOn.raw,
    dependsOnTargets: dependsOn.targets,
    correlativasRaw: correlativas.raw,
    correlativasTargets: correlativas.targets,
    trayectoRaw: trayecto.raw,
    trayecto: trayecto.trayecto,
    trayectoInvalid: trayecto.invalid,
    yearsCountRaw: yearsCount.raw,
    yearsCount: yearsCount.value,
    yearsCountInvalid: yearsCount.invalid,
    degreeRaw,
    degreeTarget,
    degreeInvalid,
    yearIndexRaw: yearIndex.raw,
    yearIndex: yearIndex.value,
    yearIndexInvalid: yearIndex.invalid,
    coursesRaw: courses.raw,
    coursesTargets: courses.targets,
    blocks,
    nonBulletLines,
  };
}
