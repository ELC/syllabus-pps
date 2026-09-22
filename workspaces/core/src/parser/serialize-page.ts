import { dump } from "js-yaml";

/** Serialize YAML frontmatter and markdown body into a stored page document. */
export function stringifyPageSource(data: Record<string, unknown>, body: string): string {
  const yaml = dump(data, { lineWidth: -1, noRefs: true }).trimEnd();
  const bodyText = body.length === 0 ? "" : body.endsWith("\n") ? body : `${body}\n`;
  return `---\n${yaml}\n---\n${bodyText}`;
}
