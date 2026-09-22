import { parseYearSlug } from "@pps/core";

import { splitPageDocument, type EditorPageKind } from "./page-document";

export function expectedEditorKind(
  slug: string,
  sources: ReadonlyArray<{ path: string; content: string }>,
): EditorPageKind | null {
  if (!slug) {
    return null;
  }

  const cached = sources.find((page) => page.path.replace(/\.md$/i, "") === slug);
  if (cached) {
    return splitPageDocument(cached.content, slug).metadata.kind;
  }

  if (parseYearSlug(slug)) {
    return "year";
  }

  return null;
}
