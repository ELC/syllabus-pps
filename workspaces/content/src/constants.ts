/** Default Supabase Storage bucket for markdown pages. */
export const DEFAULT_STORAGE_BUCKET = "content";

export const RESOURCES_TABLE = "resources";

export function pageObjectPath(slug: string): string {
  return `pages/${slug}.md`;
}
