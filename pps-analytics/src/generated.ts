import { join, resolve } from "node:path";

export const GENERATED_DIRECTORY = "_generated";

export function resolveGeneratedDir(outDir: string): string {
  return resolve(outDir, GENERATED_DIRECTORY);
}

export function resolveGeneratedDacDir(outDir: string): string {
  return join(resolveGeneratedDir(outDir), "dac");
}

export interface GeneratedFileMeta {
  generatedBy: "pps-analytics";
  generator: string;
  kind: string;
  generatedAt: string;
  docs?: string;
}

export function createGeneratedFileMeta(input: {
  generator: string;
  kind: string;
  generatedAt: string;
  docs?: string;
}): GeneratedFileMeta {
  return {
    generatedBy: "pps-analytics",
    generator: input.generator,
    kind: input.kind,
    generatedAt: input.generatedAt,
    docs: input.docs,
  };
}

export function renderGeneratedHeaderLine(meta: GeneratedFileMeta): string {
  return `${JSON.stringify(meta)}\n`;
}

export function renderGeneratedJsonFile(meta: GeneratedFileMeta, payload: unknown): string {
  return `${renderGeneratedHeaderLine(meta)}${stableJson(payload)}\n`;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function renderGeneratedMarkdown(meta: GeneratedFileMeta, body: string): string {
  const normalizedBody = body.length === 0 ? "" : body.startsWith("\n") ? body : `\n${body}`;
  return `${renderGeneratedHeaderLine(meta)}${normalizedBody}`;
}

export function renderGeneratedCommentFile(
  meta: GeneratedFileMeta,
  body: string,
  commentPrefix: "//" | "#",
): string {
  return `${commentPrefix} ${JSON.stringify(meta)}\n${body}`;
}

export function parseGeneratedJsonFile<T>(content: string): {
  meta: GeneratedFileMeta;
  payload: T;
} {
  const newline = content.indexOf("\n");
  if (newline === -1) {
    throw new Error("Generated JSON file is missing a payload line.");
  }

  return {
    meta: JSON.parse(content.slice(0, newline)) as GeneratedFileMeta,
    payload: JSON.parse(content.slice(newline + 1)) as T,
  };
}

export function parseGeneratedHeaderLine(content: string): GeneratedFileMeta {
  const newline = content.indexOf("\n");
  const header = newline === -1 ? content : content.slice(0, newline);
  return JSON.parse(header) as GeneratedFileMeta;
}
