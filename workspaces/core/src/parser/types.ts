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
  /** Raw correlativas value from frontmatter; undefined when absent. */
  correlativasRaw?: unknown;
  /** Parsed string targets from frontmatter correlativas. */
  correlativasTargets?: string[];
  /** Raw trayecto value from frontmatter; undefined when absent. */
  trayectoRaw?: unknown;
  /** Parsed trayecto from frontmatter. */
  trayecto?: import("../types").CourseTrayecto;
  /** True when frontmatter trayecto is present but malformed. */
  trayectoInvalid?: boolean;
  blocks: ZettelBlock[];
  nonBulletLines: number[];
}

export interface ParsedFrontmatter extends PageFrontmatter {
  data: PageFrontmatter;
}
