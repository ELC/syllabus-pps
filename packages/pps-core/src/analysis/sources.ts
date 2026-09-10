import { normalizeTitle, uniqueSorted } from "../normalize";
import { ZettelBlock, ZettelPage } from "../types";

export function hasSourceCue(text: string): boolean {
  return /\b(fuente|source|bibliograf|referencia|seg[uú]n|documentaci[oó]n|docs?|paper|art[ií]culo|libro|manual|doi|isbn)\b/i.test(
    text,
  );
}

export function blockHasSourceLink(
  page: ZettelPage,
  block: ZettelBlock,
  curriculumTitles: ReadonlySet<string>,
): boolean {
  return collectSourcesForBlock(page, block, curriculumTitles).length > 0;
}

export function isSourceReference(
  page: ZettelPage,
  block: ZettelBlock,
  targetPage: ZettelPage | undefined,
  normalizedTarget: string,
): boolean {
  if (!hasSourceCue(block.text) || normalizedTarget === page.normalizedTitle) {
    return false;
  }

  return (
    !targetPage ||
    (targetPage.kind !== "career" &&
      targetPage.kind !== "course" &&
      targetPage.kind !== "year" &&
      targetPage.kind !== "administrative")
  );
}

export function collectSourcesForBlock(
  page: ZettelPage,
  block: ZettelBlock,
  curriculumTitles: ReadonlySet<string>,
): string[] {
  const urlSources = block.urls.map((url) => url.target);

  if (!hasSourceCue(block.text)) {
    return uniqueSorted(urlSources);
  }

  const referenceSources = block.refs
    .filter((ref) => {
      const target = normalizeTitle(ref.resolvedTarget ?? ref.target);
      return target !== page.normalizedTitle && !curriculumTitles.has(target);
    })
    .map((ref) => ref.resolvedTarget ?? ref.target);

  return uniqueSorted([...urlSources, ...referenceSources]);
}

export interface ConceptSourceRow {
  sourceType: string;
  source: string;
  line: string;
  note: string;
}

export function collectConceptSources(
  page: ZettelPage,
  curriculumTitles: ReadonlySet<string>,
): ConceptSourceRow[] {
  return page.blocks.flatMap((block) => {
    const urlSources = block.urls.map((url) => ({
      sourceType: classifySourceType(block.text, url.target),
      source: url.target,
      line: block.line.toString(),
      note: block.text,
    }));

    if (!hasSourceCue(block.text)) {
      return urlSources;
    }

    const referenceSources = block.refs
      .filter((ref) => {
        const target = normalizeTitle(ref.resolvedTarget ?? ref.target);
        return target !== page.normalizedTitle && !curriculumTitles.has(target);
      })
      .map((ref) => ({
        sourceType: classifySourceType(block.text),
        source: ref.resolvedTarget ?? ref.target,
        line: block.line.toString(),
        note: block.text,
      }));

    return [...urlSources, ...referenceSources];
  });
}

export function classifySourceType(text: string, url?: string): string {
  const value = `${text} ${url ?? ""}`.toLocaleLowerCase("es-AR");

  if (/\b(documentaci[oó]n|docs?|manual)\b/.test(value)) {
    return "documentation";
  }

  if (/\b(bibliograf|libro|book|isbn)\b/.test(value)) {
    return "bibliography";
  }

  if (/\b(paper|art[ií]culo|article|doi|arxiv)\b/.test(value)) {
    return "article";
  }

  if (url) {
    return "url";
  }

  return "reference";
}
