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
import {
  conceptDependsOnCycleDiagnostics,
  conceptDependsOnDiagnostics,
} from "./dependencies";
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
  const { pagesByTitle: pageByTitle } = buildCurriculumIndexes(graph);
  const incomingCounts = incomingEdgeCounts(graph);
  diagnostics.push(...degreeYearDiagnostics(graph));
  diagnostics.push(...yearBodyLinkDiagnostics(graph, pageByTitle));
  diagnostics.push(...emptyPages(graph));
  diagnostics.push(...selfLinkDiagnostics(graph));
  diagnostics.push(...nonBulletContentDiagnostics(graph));
  diagnostics.push(...courseWithoutConceptLinks(graph));
  diagnostics.push(...courseCorrelativasDiagnostics(graph));
  diagnostics.push(...courseTrayectoDiagnostics(graph));
  diagnostics.push(...conceptMissingKind(graph));
  diagnostics.push(...conceptDependsOnDiagnostics(graph));
  diagnostics.push(...conceptDependsOnCycleDiagnostics(graph));
  diagnostics.push(...conceptNotesWithoutLinks(graph));
  diagnostics.push(...conceptInsufficientSources(graph));
  diagnostics.push(...conceptMissingBookSource(graph));
  diagnostics.push(...conceptNotesWithoutSourceLinks(graph));
  diagnostics.push(...resourceCatalogDiagnostics(graph));
  diagnostics.push(...unresolvedCitationDiagnostics(graph));
  diagnostics.push(...conceptLinksToNonConceptPages(graph));
  diagnostics.push(...conceptLowCourseCoverage(graph));
  diagnostics.push(...uuidReferenceDiagnostics(graph));
  diagnostics.push(...orphanDiagnostics(graph, incomingCounts));
  diagnostics.push(...administrativeDiagnostics(graph));
  diagnostics.push(...courseYearDiagnostics(graph));

  return diagnostics.sort(compareDiagnostics);
}
