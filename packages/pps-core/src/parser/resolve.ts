import { normalizeTitle } from "../normalize";
import { ConceptTag, PageRef, ZettelBlock } from "../types";
import { PageIndex, resolveLinkTarget } from "./page-index";

export function resolveBlock(block: ZettelBlock, index: PageIndex): ZettelBlock {
  return {
    ...block,
    refs: block.refs.map((ref) => resolveRef(ref, index)),
    tags: block.tags.map((tag) => resolveTag(tag, index)),
  };
}

export function resolveRef(ref: PageRef, index: PageIndex): PageRef {
  const uuidResolved = ref.isUuid ? index.idToTitle.get(ref.target) : undefined;
  const resolvedTarget = uuidResolved ?? resolveLinkTarget(ref.target, index);
  return {
    ...ref,
    resolvedTarget: resolvedTarget === ref.target && ref.isUuid && !uuidResolved ? undefined : resolvedTarget,
    normalizedTarget: normalizeTitle(resolvedTarget),
  };
}

export function resolveTag(tag: ConceptTag, index: PageIndex): ConceptTag {
  const uuidResolved = tag.isUuid ? index.idToTitle.get(tag.target) : undefined;
  const resolvedTarget = uuidResolved ?? resolveLinkTarget(tag.target, index);
  return {
    ...tag,
    resolvedTarget: resolvedTarget === tag.target && tag.isUuid && !uuidResolved ? undefined : resolvedTarget,
    normalizedTarget: normalizeTitle(resolvedTarget),
  };
}
