export const pageKinds = [
  "career",
  "year",
  "course",
  "concept",
  "journal",
  "administrative",
  "unknown",
] as const;

export type PageKind = (typeof pageKinds)[number];

export const edgeKinds = ["page-ref", "concept-tag", "concept-dependency"] as const;

export type EdgeKind = (typeof edgeKinds)[number];

export const diagnosticSeverities = ["info", "warning", "error"] as const;

export type DiagnosticSeverity = (typeof diagnosticSeverities)[number];

export const diagnosticCodes = [
  "administrative-page",
  "concept-links-to-non-concept",
  "concept-low-course-coverage",
  "concept-note-without-link",
  "concept-missing-kind",
  "concept-insufficient-sources",
  "concept-missing-book-source",
  "concept-note-without-source-link",
  "course-without-concept-links",
  "course-without-year-link",
  "empty-page",
  "expected-course-missing",
  "expected-year-missing",
  "orphan-concept",
  "orphan-page",
  "self-link",
  "uuid-ref-resolved",
  "uuid-ref-unresolved",
  "uuid-tag-resolved",
  "uuid-tag-unresolved",
  "non-bullet-content",
  "concept-missing-depends-on",
  "concept-depends-on-invalid",
  "concept-depends-on-unresolved",
  "concept-depends-on-non-concept",
  "concept-depends-on-self",
  "concept-depends-on-cycle",
] as const;

export type DiagnosticCode = (typeof diagnosticCodes)[number];

export interface PageRef {
  raw: string;
  target: string;
  normalizedTarget: string;
  isUuid: boolean;
  resolvedTarget?: string;
  line: number;
}

export interface ConceptTag {
  raw: string;
  target: string;
  normalizedTarget: string;
  isUuid: boolean;
  resolvedTarget?: string;
  line: number;
}

export interface UrlLink {
  raw: string;
  target: string;
  line: number;
}

export interface ZettelBlock {
  line: number;
  text: string;
  refs: PageRef[];
  tags: ConceptTag[];
  urls: UrlLink[];
}

export interface ConceptDependency {
  raw: string;
  target: string;
  normalizedTarget: string;
  resolvedTarget?: string;
}

export interface PageFrontmatter {
  title?: string;
  slug?: string;
  kind?: PageKind;
  id?: string;
  version?: number;
  updatedAt?: string;
  /** Direct prerequisite concept titles for kind: concept pages. */
  dependsOn: string[];
}

export interface ZettelPage {
  id?: string;
  slug: string;
  title: string;
  normalizedTitle: string;
  path: string;
  kind: PageKind;
  declaredKind?: PageKind;
  blocks: ZettelBlock[];
  refs: PageRef[];
  tags: ConceptTag[];
  urls: UrlLink[];
  nonBulletLines?: number[];
  /** Parsed from frontmatter; undefined when the field is absent. */
  dependsOn?: ConceptDependency[];
  /** True when frontmatter dependsOn is present but malformed. */
  dependsOnInvalid?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  rawTarget: string;
  line: number;
}

export type YearTitle = `año ${number}`;

export interface CurriculumYear {
  title: YearTitle;
  courses: string[];
}

export interface ExpectedCurriculum {
  years: CurriculumYear[];
  administrativePages?: string[];
  /** Repo-relative path to flat markdown pages directory. */
  contentDir?: string;
}

export interface CurriculumGraph {
  generatedAt: string;
  pages: ZettelPage[];
  edges: GraphEdge[];
  expected: ExpectedCurriculum;
}

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: DiagnosticCode;
  message: string;
  page?: string;
  line?: number;
  details?: Record<string, unknown>;
}

export interface DiagnosticSummary {
  severity: DiagnosticSeverity;
  code: DiagnosticCode;
  page: string;
}
