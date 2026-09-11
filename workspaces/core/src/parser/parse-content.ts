import { normalizeTitle, stripMarkdownExtension } from "../normalize";
import { parseFrontmatter } from "./frontmatter";
import { slugFromPath } from "../slug";
import { PageKind, ZettelBlock } from "../types";
import { extractConceptTags, extractPageRefs, extractUrlLinks } from "./extractors";
import { RawPage } from "./types";

const VALID_KINDS = new Set<PageKind>([
  "career",
  "year",
  "course",
  "concept",
  "journal",
  "administrative",
  "unknown",
]);

function parseKind(value: unknown): PageKind | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return VALID_KINDS.has(value as PageKind) ? (value as PageKind) : undefined;
}

function parseDependsOn(value: unknown): { raw: unknown; targets?: string[] } {
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
  const dependsOn = parseDependsOn(parsed.data.dependsOn);
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
    blocks,
    nonBulletLines,
  };
}
