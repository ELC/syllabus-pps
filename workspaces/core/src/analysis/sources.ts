import { catalogSourceType, isBookResource } from "../resources";
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

function citationSourceIds(block: ZettelBlock): string[] {
  return block.citations.map((citation) => citation.id);
}

export function collectSourcesForBlock(
  page: ZettelPage,
  block: ZettelBlock,
  curriculumTitles: ReadonlySet<string>,
): string[] {
  const citationSources = citationSourceIds(block);
  if (citationSources.length > 0) {
    return uniqueSorted(citationSources);
  }

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

export const MINIMUM_CONCEPT_SOURCES = 3;

export function isBookCitation(block: ZettelBlock): boolean {
  return block.citations.some((citation) => citation.resolved && isBookResource(citation.resolved));
}

export function collectPageBookSources(
  page: ZettelPage,
  _curriculumTitles: ReadonlySet<string>,
): string[] {
  return uniqueSorted(
    page.blocks.flatMap((block) =>
      block.citations
        .filter((citation) => citation.resolved && isBookResource(citation.resolved))
        .map((citation) => citation.id),
    ),
  );
}

export function collectPageSources(
  page: ZettelPage,
  curriculumTitles: ReadonlySet<string>,
): string[] {
  return uniqueSorted(
    page.blocks.flatMap((block) => collectSourcesForBlock(page, block, curriculumTitles)),
  );
}

export function collectConceptSources(
  page: ZettelPage,
  _curriculumTitles: ReadonlySet<string>,
): ConceptSourceRow[] {
  return page.blocks.flatMap((block) =>
    block.citations.map((citation) => ({
      sourceType: citation.resolved ? catalogSourceType(citation.resolved) : "reference",
      source: citation.resolved?.URL ?? citation.id,
      line: block.line.toString(),
      note: block.text,
    })),
  );
}

export function collectUsedCitationIds(pages: ZettelPage[]): Set<string> {
  const used = new Set<string>();

  for (const page of pages) {
    for (const block of page.blocks) {
      for (const citation of block.citations) {
        used.add(citation.id);
      }
    }
  }

  return used;
}
