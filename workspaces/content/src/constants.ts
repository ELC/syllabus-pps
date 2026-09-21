/** Default Supabase Storage bucket for markdown pages. */
export const DEFAULT_STORAGE_BUCKET = "content";

export const RESOURCES_TABLE = "resources";

export const ROADMAP_COURSE_LAYOUTS_TABLE = "roadmap_course_layouts";

export const ROADMAP_CONCEPT_LAYOUTS_TABLE = "roadmap_concept_layouts";

export function pageObjectPath(slug: string): string {
  return `pages/${slug}.md`;
}
