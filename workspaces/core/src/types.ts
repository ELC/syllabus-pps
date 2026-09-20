export const pageKinds = [
  "degree",
  "year",
  "course",
  "concept",
  "journal",
  "administrative",
  "unknown",
] as const;

export type PageKind = (typeof pageKinds)[number];

export const courseTrayectos = [
  "Trayecto Principal",
  "Trayecto No Estructurado",
] as const;

export type CourseTrayecto = (typeof courseTrayectos)[number];

export const COURSE_TRAYECTO_PRINCIPAL = courseTrayectos[0];
export const COURSE_TRAYECTO_NO_ESTRUCTURADO = courseTrayectos[1];
export const DEFAULT_COURSE_TRAYECTO = COURSE_TRAYECTO_PRINCIPAL;

/** Legacy and shorthand frontmatter values mapped to canonical trayecto labels. */
export const courseTrayectoAliases: Record<string, CourseTrayecto> = {
  principal: COURSE_TRAYECTO_PRINCIPAL,
  "no-estructurado": COURSE_TRAYECTO_NO_ESTRUCTURADO,
};

export const edgeKinds = [
  "page-ref",
  "concept-tag",
  "concept-dependency",
  "course-prerequisite",
] as const;

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
  "year-link-unresolved",
  "year-links-non-course",
  "degree-years-count-invalid",
  "degree-years-mismatch",
  "year-missing-degree",
  "year-degree-unresolved",
  "year-index-invalid",
  "year-courses-unresolved",
  "year-courses-non-course",
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
  "course-correlativas-invalid",
  "course-correlativas-unresolved",
  "course-correlativas-non-course",
  "course-correlativas-self",
  "course-correlativas-on-non-course",
  "course-trayecto-invalid",
  "course-trayecto-on-non-course",
  "citation-unresolved",
  "resource-catalog-invalid",
  "resource-catalog-unused",
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

export interface CitationRef {
  raw: string;
  id: string;
  line: number;
  resolved?: import("./resources/types").ResourceCatalogEntry;
}

export interface ZettelBlock {
  line: number;
  text: string;
  refs: PageRef[];
  tags: ConceptTag[];
  urls: UrlLink[];
  citations: CitationRef[];
}

export interface ConceptDependency {
  raw: string;
  target: string;
  normalizedTarget: string;
  resolvedTarget?: string;
}

export type CourseCorrelativa = ConceptDependency;

export interface PageFrontmatter {
  title?: string;
  slug?: string;
  kind?: PageKind;
  id?: string;
  version?: number;
  updatedAt?: string;
  /** Direct prerequisite concept titles for kind: concept pages. */
  dependsOn: string[];
  /** Courses that must be completed before this course (kind: course only). */
  correlativas?: string[];
  /** Course track; defaults to trayecto principal when omitted on course pages. */
  trayecto?: CourseTrayecto;
  /** Number of academic years for kind: degree. */
  years?: number;
  /** Parent degree title for kind: year. */
  degree?: string;
  /** 1-based year index within the degree for kind: year. */
  yearIndex?: number;
  /** Course page slugs assigned to this year (kind: year). */
  courses?: string[];
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
  citations: CitationRef[];
  nonBulletLines?: number[];
  /** Parsed from frontmatter; undefined when the field is absent. */
  dependsOn?: ConceptDependency[];
  /** True when frontmatter dependsOn is present but malformed. */
  dependsOnInvalid?: boolean;
  /** Parsed from frontmatter; undefined when the field is absent. */
  correlativas?: CourseCorrelativa[];
  /** True when frontmatter correlativas is present but malformed. */
  correlativasInvalid?: boolean;
  /** Parsed from frontmatter; undefined when the field is absent. */
  trayecto?: CourseTrayecto;
  /** True when frontmatter trayecto is present but malformed. */
  trayectoInvalid?: boolean;
  /** Parsed from frontmatter on degree pages. */
  yearsCount?: number;
  /** True when frontmatter years is present but malformed. */
  yearsCountInvalid?: boolean;
  /** Parsed from frontmatter on year pages. */
  degree?: CourseCorrelativa;
  /** True when frontmatter degree is present but malformed. */
  degreeInvalid?: boolean;
  yearIndex?: number;
  /** True when frontmatter yearIndex is present but malformed. */
  yearIndexInvalid?: boolean;
  /** Parsed from frontmatter on year pages. */
  courses?: CourseCorrelativa[];
  /** True when frontmatter courses is present but malformed. */
  coursesInvalid?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  rawTarget: string;
  line: number;
}

export interface CurriculumYear {
  title: string;
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
  resources: import("./resources/types").ResourceCatalogEntry[];
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
