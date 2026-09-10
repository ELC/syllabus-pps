import { load as loadYaml } from "js-yaml";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = source.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { data: {}, content: source };
  }

  let data: Record<string, unknown> = {};
  try {
    const parsed = loadYaml(match[1] ?? "");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }

  return {
    data,
    content: source.slice(match[0].length),
  };
}
