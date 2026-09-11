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
  /** Raw dependsOn value from frontmatter; undefined when absent. */
  dependsOnRaw?: unknown;
  /** Parsed string targets from frontmatter dependsOn. */
  dependsOnTargets?: string[];
  blocks: ZettelBlock[];
  nonBulletLines: number[];
}

export interface ParsedFrontmatter extends PageFrontmatter {
  data: PageFrontmatter;
}
