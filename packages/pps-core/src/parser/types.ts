import { PageFrontmatter, PageKind, ZettelBlock } from "../types";

export interface ParseOptions {
  expectedCourseTitles?: Set<string>;
  expectedYearTitles?: Set<string>;
  administrativeTitles?: Set<string>;
}

export interface PageSource {
  path: string;
  content: string;
}

export interface RawPage {
  id?: string;
  slug: string;
  title: string;
  normalizedTitle: string;
  path: string;
  frontmatterKind?: PageKind;
  blocks: ZettelBlock[];
  nonBulletLines: number[];
}

export interface ParsedFrontmatter extends PageFrontmatter {
  data: PageFrontmatter;
}
