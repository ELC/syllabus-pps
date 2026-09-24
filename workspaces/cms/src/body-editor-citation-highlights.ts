import { segmentBodyWithResourceCitations } from "./body-editor-citations";

export const CMS_CITATION_HIGHLIGHT_NAME = "cms-citation";

export function supportsCitationHighlights(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

export function syncCitationHighlights(textarea: HTMLTextAreaElement, value: string): void {
  if (!supportsCitationHighlights()) {
    return;
  }

  const segments = segmentBodyWithResourceCitations(value);
  const ranges: StaticRange[] = [];

  for (const segment of segments) {
    if (segment.kind !== "citation") {
      continue;
    }
    try {
      ranges.push(
        new StaticRange({
          startContainer: textarea,
          startOffset: segment.start,
          endContainer: textarea,
          endOffset: segment.end,
        }),
      );
    } catch {
      CSS.highlights.delete(CMS_CITATION_HIGHLIGHT_NAME);
      return;
    }
  }

  if (ranges.length === 0) {
    CSS.highlights.delete(CMS_CITATION_HIGHLIGHT_NAME);
    return;
  }

  CSS.highlights.set(CMS_CITATION_HIGHLIGHT_NAME, new Highlight(...ranges));
}

export function clearCitationHighlights(): void {
  if (!supportsCitationHighlights()) {
    return;
  }
  CSS.highlights.delete(CMS_CITATION_HIGHLIGHT_NAME);
}
