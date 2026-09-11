import { ZettelPage } from "../types";
import { classifyPage } from "./classify";
import { buildPageIndex } from "./page-index";
import { parsePageContent } from "./parse-content";
import { resolveBlock } from "./resolve";
import { PageSource, ParseOptions } from "./types";

export type { PageSource, ParseOptions, RawPage } from "./types";
export { parseFrontmatter } from "./frontmatter";
export { parsePageContent } from "./parse-content";
export { slugifyTitle } from "../slug";

export function parsePages(sources: PageSource[], options: ParseOptions = {}): ZettelPage[] {
  const rawPages = sources.map((source) => parsePageContent(source));
  const index = buildPageIndex(rawPages);

  const resolvedPages = rawPages.map((page) => {
    const blocks = page.blocks.map((block) => resolveBlock(block, index));
    const refs = blocks.flatMap((block) => block.refs);
    const tags = blocks.flatMap((block) => block.tags);
    const urls = blocks.flatMap((block) => block.urls);

    return {
      ...page,
      blocks,
      refs,
      tags,
      urls,
    };
  });

  const conceptTitles = new Set(
    resolvedPages.flatMap((page) => [
      ...page.refs.map((ref) => ref.normalizedTarget),
      ...page.tags.map((tag) => tag.normalizedTarget),
    ]),
  );

  return resolvedPages
    .map((page) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      normalizedTitle: page.normalizedTitle,
      path: page.path,
      declaredKind: page.frontmatterKind,
      kind: classifyPage(page, page.tags, options, conceptTitles),
      blocks: page.blocks,
      refs: page.refs,
      tags: page.tags,
      urls: page.urls,
      nonBulletLines: page.nonBulletLines,
    }))
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}
