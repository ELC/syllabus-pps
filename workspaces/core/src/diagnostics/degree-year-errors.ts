import type { ConceptDependency, Diagnostic, PageRef, ZettelPage } from "../types";

export function degreeYearsCountInvalidDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "degree-years-count-invalid",
    message: `Degree "${page.title}" has an invalid years count in frontmatter.`,
    page: page.title,
  };
}

export function degreeYearsMismatchDiagnostic(
  degreePage: ZettelPage,
  linkedYearPages: readonly ZettelPage[],
): Diagnostic {
  const declared = degreePage.yearsCount ?? 0;
  const linked = linkedYearPages.length;
  return {
    severity: "warning",
    code: "degree-years-mismatch",
    message: `Degree "${degreePage.title}" declares ${declared} year(s) but ${linked} year page(s) reference it.`,
    page: degreePage.title,
    details: { declared, linked },
  };
}

export function yearDegreeInvalidFrontmatterDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-degree-unresolved",
    message: `Year page "${page.title}" has invalid degree frontmatter.`,
    page: page.title,
  };
}

export function yearMissingDegreeDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-missing-degree",
    message: `Year page "${page.title}" must declare a degree.`,
    page: page.title,
  };
}

export function yearDegreeUnresolvedDiagnostic(yearPage: ZettelPage, degree: ConceptDependency): Diagnostic {
  return {
    severity: "error",
    code: "year-degree-unresolved",
    message: `Year page "${yearPage.title}" references unresolved degree "${degree.target}".`,
    page: yearPage.title,
  };
}

export function yearIndexInvalidDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-index-invalid",
    message: `Year page "${page.title}" has an invalid yearIndex.`,
    page: page.title,
  };
}

export function yearCoursesMalformedDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-courses-unresolved",
    message: `Year page "${page.title}" has malformed courses frontmatter.`,
    page: page.title,
  };
}

export function yearCoursesNoEstructuradoMalformedDiagnostic(page: ZettelPage): Diagnostic {
  return {
    severity: "error",
    code: "year-courses-no-estructurado-invalid",
    message: `Year page "${page.title}" has malformed coursesNoEstructurado frontmatter.`,
    page: page.title,
  };
}

export function yearCourseTrayectoOverlapDiagnostic(
  yearPage: ZettelPage,
  courseLabel: string,
): Diagnostic {
  return {
    severity: "warning",
    code: "year-course-trayecto-overlap",
    message: `Year page "${yearPage.title}" lists "${courseLabel}" in both Trayecto Principal and Trayecto No Estructurado.`,
    page: yearPage.title,
  };
}

export function yearCourseUnresolvedDiagnostic(
  yearPage: ZettelPage,
  course: ConceptDependency,
): Diagnostic {
  return {
    severity: "error",
    code: "year-courses-unresolved",
    message: `Year page "${yearPage.title}" lists unresolved course "${course.target}".`,
    page: yearPage.title,
  };
}

export function yearCourseNonCourseDiagnostic(
  yearPage: ZettelPage,
  course: ConceptDependency,
  targetPage: ZettelPage,
): Diagnostic {
  const courseLabel = course.resolvedTarget ?? course.target;
  return {
    severity: "warning",
    code: "year-courses-non-course",
    message: `Year page "${yearPage.title}" lists "${courseLabel}", which is not a course page.`,
    page: yearPage.title,
    details: { targetKind: targetPage.kind },
  };
}

export function yearLinkUnresolvedDiagnostic(yearPage: ZettelPage, ref: PageRef): Diagnostic {
  return {
    severity: "error",
    code: "year-link-unresolved",
    message: `Year page "${yearPage.title}" links to unresolved page "${ref.target}".`,
    page: yearPage.title,
    line: ref.line,
  };
}

export function yearLinksNonCourseDiagnostic(
  yearPage: ZettelPage,
  ref: PageRef,
  targetPage: ZettelPage,
): Diagnostic {
  const targetLabel = ref.resolvedTarget ?? ref.target;
  return {
    severity: "warning",
    code: "year-links-non-course",
    message: `Year page "${yearPage.title}" links to "${targetLabel}", which is not a course page.`,
    page: yearPage.title,
    line: ref.line,
    details: { targetKind: targetPage.kind },
  };
}
