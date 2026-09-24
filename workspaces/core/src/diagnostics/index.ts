import { buildCurriculumIndexes } from "../analysis";
import { incomingEdgeCounts } from "../graph";
import { CurriculumGraph, Diagnostic } from "../types";
import { compareDiagnostics } from "./compare";
import {
  conceptLinksToNonConceptPages,
  conceptLowCourseCoverage,
  conceptMissingKind,
  conceptNotesWithoutLinks,
} from "./concepts";
import { courseCorrelativasDiagnostics } from "./course-correlativas";
import { courseTrayectoDiagnostics } from "./course-trayecto";
import { courseWithoutConceptLinks, courseYearDiagnostics } from "./courses";
import { degreeYearDiagnostics, yearBodyLinkDiagnostics } from "./degree-year";
import {
  administrativeDiagnostics,
  emptyPages,
  orphanDiagnostics,
  nonBulletContentDiagnostics,
  selfLinkDiagnostics,
} from "./pages";
import {
  resourceCatalogDiagnostics,
  unresolvedCitationDiagnostics,
} from "./resources";
import {
  conceptInsufficientSources,
  conceptMissingBookSource,
  conceptNotesWithoutSourceLinks,
} from "./sources";
import { uuidReferenceDiagnostics } from "./uuid";

export { compareDiagnostics } from "./compare";
export {
  blockingDiagnosticSeverities,
  countDiagnosticsBySeverity,
  hasBlockingDiagnostics,
  hasDiagnosticsWithSeverity,
  hasErrorDiagnostics,
} from "./helpers";
export {
  createSeverityClassNameResolver,
  isStyledDiagnosticSeverity,
  styledDiagnosticSeverities,
  type StyledDiagnosticSeverity,
} from "./view";

export function collectDiagnostics(graph: CurriculumGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const indexes = buildCurriculumIndexes(graph);
  const pageByTitle = indexes.pagesByTitle;
  const incomingCounts = incomingEdgeCounts(graph);

  const degreeYear = degreeYearDiagnostics(graph);
  diagnostics.push(...degreeYear);

  const yearBodyLinks = yearBodyLinkDiagnostics(graph, pageByTitle);
  diagnostics.push(...yearBodyLinks);

  const empty = emptyPages(graph);
  diagnostics.push(...empty);

  const selfLinks = selfLinkDiagnostics(graph);
  diagnostics.push(...selfLinks);

  const nonBullet = nonBulletContentDiagnostics(graph);
  diagnostics.push(...nonBullet);

  const coursesWithoutConcepts = courseWithoutConceptLinks(graph);
  diagnostics.push(...coursesWithoutConcepts);

  const correlativas = courseCorrelativasDiagnostics(graph);
  diagnostics.push(...correlativas);

  const trayecto = courseTrayectoDiagnostics(graph);
  diagnostics.push(...trayecto);

  const missingConceptKind = conceptMissingKind(graph);
  diagnostics.push(...missingConceptKind);

  const notesWithoutLinks = conceptNotesWithoutLinks(graph);
  diagnostics.push(...notesWithoutLinks);

  const insufficientSources = conceptInsufficientSources(graph);
  diagnostics.push(...insufficientSources);

  const missingBookSource = conceptMissingBookSource(graph);
  diagnostics.push(...missingBookSource);

  const notesWithoutSourceLinks = conceptNotesWithoutSourceLinks(graph);
  diagnostics.push(...notesWithoutSourceLinks);

  const resourceCatalog = resourceCatalogDiagnostics(graph);
  diagnostics.push(...resourceCatalog);

  const unresolvedCitations = unresolvedCitationDiagnostics(graph);
  diagnostics.push(...unresolvedCitations);

  const conceptNonConceptLinks = conceptLinksToNonConceptPages(graph);
  diagnostics.push(...conceptNonConceptLinks);

  const lowCoverage = conceptLowCourseCoverage(graph);
  diagnostics.push(...lowCoverage);

  const uuidRefs = uuidReferenceDiagnostics(graph);
  diagnostics.push(...uuidRefs);

  const orphans = orphanDiagnostics(graph, incomingCounts);
  diagnostics.push(...orphans);

  const administrative = administrativeDiagnostics(graph);
  diagnostics.push(...administrative);

  const courseYears = courseYearDiagnostics(graph);
  diagnostics.push(...courseYears);

  const sorted = diagnostics.sort(compareDiagnostics);
  return sorted;
}
