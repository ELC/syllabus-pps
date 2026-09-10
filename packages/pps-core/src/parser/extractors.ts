import { isUuid, normalizeTitle } from "../normalize";
import { ConceptTag, PageRef, UrlLink } from "../types";

export function extractPageRefs(text: string, line: number): PageRef[] {
  const refs: PageRef[] = [];
  const linkPattern = /\[\[([^\]]+)\]\]/g;

  for (const match of text.matchAll(linkPattern)) {
    if (match.index !== undefined && text[match.index - 1] === "#") {
      continue;
    }

    const target = (match[1] ?? "").trim();
    refs.push({
      raw: match[0],
      target,
      normalizedTarget: normalizeTitle(target),
      isUuid: isUuid(target),
      line,
    });
  }

  return refs;
}

export function extractConceptTags(text: string, line: number): ConceptTag[] {
  const tags: ConceptTag[] = [];
  const bracketTagPattern = /#\[\[([^\]]+)\]\]/g;
  const bracketTagRanges: Array<[number, number]> = [];

  for (const match of text.matchAll(bracketTagPattern)) {
    const target = (match[1] ?? "").trim();
    const start = match.index ?? -1;
    if (start >= 0) {
      bracketTagRanges.push([start, start + match[0].length]);
    }

    tags.push({
      raw: match[0],
      target,
      normalizedTarget: normalizeTitle(target),
      isUuid: isUuid(target),
      line,
    });
  }

  const simpleTagPattern = /(^|[\s(])#([A-Za-z0-9À-ÿ_-]+)/g;
  for (const match of text.matchAll(simpleTagPattern)) {
    const hashIndex = (match.index ?? 0) + (match[1]?.length ?? 0);
    if (bracketTagRanges.some(([start, end]) => hashIndex >= start && hashIndex < end)) {
      continue;
    }

    const target = (match[2] ?? "").trim();
    tags.push({
      raw: `#${target}`,
      target,
      normalizedTarget: normalizeTitle(target),
      isUuid: false,
      line,
    });
  }

  return tags;
}

export function extractUrlLinks(text: string, line: number): UrlLink[] {
  const urls: UrlLink[] = [];
  const urlPattern = /https?:\/\/[^\s)\]]+/g;

  for (const match of text.matchAll(urlPattern)) {
    const raw = trimTrailingUrlPunctuation(match[0] ?? "");
    if (!raw) {
      continue;
    }

    urls.push({
      raw,
      target: raw,
      line,
    });
  }

  return urls;
}

function trimTrailingUrlPunctuation(value: string): string {
  return value.replace(/[.,;:!?]+$/g, "");
}
