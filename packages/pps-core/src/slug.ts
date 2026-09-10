import { normalizeTitle } from "./normalize";

export function slugifyTitle(title: string): string {
  return normalizeTitle(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugFromPath(path: string): string {
  const fileName = path.split(/[/\\]/).pop() ?? path;
  return fileName.replace(/\.md$/i, "");
}
