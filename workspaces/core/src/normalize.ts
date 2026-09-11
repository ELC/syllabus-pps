const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "es-AR"));
}
