/** Same wire shape as `@pps/core` parser `CITATION_PATTERN`. */
export const RESOURCE_CITATION_PATTERN = /\[@([a-z0-9]+(?:-[a-z0-9]+)*)\]/g;

export type BodyEditorCitationSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; id: string; raw: string; start: number; end: number };

export function segmentBodyWithResourceCitations(value: string): BodyEditorCitationSegment[] {
  const segments: BodyEditorCitationSegment[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(RESOURCE_CITATION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", text: value.slice(lastIndex, index) });
    }
    const id = match[1] ?? "";
    const raw = match[0];
    segments.push({
      kind: "citation",
      id,
      raw,
      start: index,
      end: index + raw.length,
    });
    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    segments.push({ kind: "text", text: value.slice(lastIndex) });
  }

  return segments;
}

/** Catalog id when `offset` falls inside a `[@id]` citation, else null. */
export function resourceCitationIdAtOffset(value: string, offset: number): string | null {
  if (offset < 0) {
    return null;
  }

  for (const match of value.matchAll(RESOURCE_CITATION_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (offset >= start && offset < end) {
      return match[1] ?? null;
    }
  }

  return null;
}
