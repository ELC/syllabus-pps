import { ResourceCatalogIndex } from "../resources";
import { ZettelPage } from "../types";
import { classifyPage } from "./classify";
import { buildPageIndex } from "./page-index";
import { parsePageContent } from "./parse-content";
import { resolveBlock, resolveCorrelativa, resolveDependsOn } from "./resolve";
import { PageSource, ParseOptions } from "./types";

export type { PageSource, ParseOptions, RawPage } from "./types";
export { parseFrontmatter } from "./frontmatter";
export { parsePageContent } from "./parse-content";
export { slugifyTitle } from "../slug";
export { extractCitationRefs, stripCitationRefs } from "./extractors";

function resolveBlockCitations(
  block: ZettelPage["blocks"][number],
  catalog: ResourceCatalogIndex | undefined,
): ZettelPage["blocks"][number] {
  if (!catalog || block.citations.length === 0) {
    return block;
  }

  return {
    ...block,
    citations: block.citations.map((citation) => ({
      ...citation,
      resolved: catalog.byId.get(citation.id),
    })),
  };
}

export function parsePages(
  sources: PageSource[],
  options: ParseOptions = {},
  catalog?: ResourceCatalogIndex,
): ZettelPage[] {
  const rawPages = sources.map((source) => parsePageContent(source));
  const index = buildPageIndex(rawPages);

  const resolvedPages = rawPages.map((page) => {
    const blocks = page.blocks
      .map((block) => resolveBlock(block, index))
      .map((block) => resolveBlockCitations(block, catalog));
    const refs = blocks.flatMap((block) => block.refs);
    const tags = blocks.flatMap((block) => block.tags);
    const urls = blocks.flatMap((block) => block.urls);
    const citations = blocks.flatMap((block) => block.citations);

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
    .map((page) => {
      const kind = classifyPage(page, page.tags, options, conceptTitles);
      const dependsOnInvalid =
        page.dependsOnRaw !== undefined && page.dependsOnTargets === undefined;
      const dependsOn = dependsOnInvalid
        ? []
        : page.dependsOnTargets?.map((target) => resolveDependsOn(target, index));
      const correlativasInvalid =
        page.correlativasRaw !== undefined && page.correlativasTargets === undefined;
      const correlativas = correlativasInvalid
        ? []
        : page.correlativasTargets?.map((target) => resolveCorrelativa(target, index));

      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        normalizedTitle: page.normalizedTitle,
        path: page.path,
        declaredKind: page.frontmatterKind,
        kind,
        blocks: page.blocks,
        refs: page.refs,
        tags: page.tags,
        urls: page.urls,
        citations: page.blocks.flatMap((block) => block.citations),
        nonBulletLines: page.nonBulletLines,
        dependsOn,
        dependsOnInvalid,
        correlativas,
        correlativasInvalid,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
}
