import { useEffect, useMemo, useState, type ReactElement } from "react";

import {
  buildYearSlug,
  normalizeTitle,
  PageKind,
  parseYearSlug,
  yearDisplayLabel,
  type ResourceCatalogEntry,
} from "@pps/core";
import { courseTitleBySlug, type CoursePageOption } from "../course-pages";
import type { ConceptPageOption } from "../concept-pages";
import type { PageLinkOption } from "../page-link-options";
import {
  buildEditorCatalogGraph,
  conceptsForCourseInGraph,
  coursesForConceptInGraph,
  yearPagesForCourseInSources,
} from "../page-catalog-links";
import {
  composePageDocument,
  EDITOR_KINDS,
  type EditorPageKind,
  type PageMetadata,
} from "../page-document";
import { BodyEditor } from "./BodyEditor";
import { DependsOnCombobox } from "./DependsOnCombobox";
import {
  ContentEditorSkeleton,
  MetaCatalogLinkRowSkeleton,
  MetaDegreeDisplaySkeleton,
  MetaPrimaryStackSkeleton,
} from "./MetaFormSkeleton";
import { MetaDropdown } from "./MetaDropdown";

const KIND_LABELS: Record<EditorPageKind, string> = {
  degree: "Carrera",
  year: "Año",
  course: "Materia",
  concept: "Concepto",
  journal: "Diario",
  administrative: "Administrativa",
};

function titlePickerOptions(catalogTitles: string[], selected: string[], currentTitle: string): string[] {
  const merged = new Set(catalogTitles);
  for (const title of selected) {
    merged.add(title);
  }
  merged.delete(currentTitle.trim());
  return [...merged].sort((left, right) => left.localeCompare(right, "es-AR"));
}

export interface PageMetadataFormProps {
  metadata: PageMetadata;
  pageSlug: string;
  conceptTitles: string[];
  conceptPages: ConceptPageOption[];
  pageLinks: PageLinkOption[];
  courseTitles: string[];
  coursePages: CoursePageOption[];
  degreeTitles: string[];
  /** Long display name (`fullName`) keyed by degree title or slug. */
  degreeDisplayByTitle: ReadonlyMap<string, string>;
  /** Degree page slug keyed by degree title or slug. */
  degreeSlugByTitle: ReadonlyMap<string, string>;
  body: string;
  resources: ResourceCatalogEntry[];
  onChange: (metadata: PageMetadata) => void;
  onBodyChange: (body: string) => void;
  /** False while the selected page document is still loading into the editor. */
  documentReady: boolean;
  /** Kind inferred from slug or cached sources while the document is loading. */
  expectedKind: EditorPageKind | null;
  /** False while the full page catalog is still loading from Storage. */
  catalogReady: boolean;
  /** Slugs listed in Storage (year buttons mark missing entries). */
  listedPageSlugs: ReadonlySet<string>;
  /** Display titles keyed by page slug. */
  pageTitlesBySlug: ReadonlyMap<string, string>;
  /** Full Storage catalog (year grids, concept backlinks). */
  allSources: ReadonlyArray<{ path: string; content: string }>;
  onOpenPage: (slug: string) => void;
}

export function PageMetadataForm({
  metadata,
  pageSlug,
  conceptTitles,
  conceptPages,
  pageLinks,
  courseTitles,
  coursePages,
  degreeTitles: _degreeTitles,
  degreeDisplayByTitle,
  degreeSlugByTitle,
  body,
  resources,
  onChange,
  onBodyChange,
  documentReady,
  expectedKind,
  catalogReady,
  listedPageSlugs,
  pageTitlesBySlug,
  allSources,
  onOpenPage,
}: PageMetadataFormProps): ReactElement {
  const [dependsOnResetKey, setDependsOnResetKey] = useState(0);

  useEffect(() => {
    setDependsOnResetKey((current) => current + 1);
  }, [pageSlug]);

  function patch(partial: Partial<PageMetadata>): void {
    onChange({ ...metadata, ...partial });
  }

  function patchYearCourseList(
    field: "courses" | "coursesNoEstructurado",
    next: string[],
  ): void {
    const otherField = field === "courses" ? "coursesNoEstructurado" : "courses";
    const otherSet = new Set(metadata[otherField]);
    const filtered = next.filter((slug) => !otherSet.has(slug));
    patch({ [field]: filtered });
  }

  function sortCourseSlugs(slugs: readonly string[]): string[] {
    return [...slugs].sort((left, right) =>
      courseTitleBySlug(coursePages, left).localeCompare(
        courseTitleBySlug(coursePages, right),
        "es-AR",
      ),
    );
  }

  function moveYearCourseBetweenTrayectos(
    slug: string,
    fromField: "courses" | "coursesNoEstructurado",
  ): void {
    const toField = fromField === "courses" ? "coursesNoEstructurado" : "courses";
    if (!metadata[fromField].includes(slug)) {
      return;
    }
    patch({
      [fromField]: metadata[fromField].filter((entry) => entry !== slug),
      [toField]: sortCourseSlugs([...metadata[toField], slug]),
    });
  }

  const kindOptions = useMemo(
    () => EDITOR_KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] })),
    [],
  );

  const correlativasChoices = titlePickerOptions(
    courseTitles,
    metadata.correlativas,
    metadata.title,
  );

  const layoutKind = documentReady ? metadata.kind : expectedKind;
  const isCourse = layoutKind === "course";
  const isDegree = layoutKind === "degree";
  const isYear = layoutKind === "year";
  const wideTitleInput = Boolean(layoutKind) && !isCourse && !isDegree && !isYear;
  const kindForCatalog = documentReady ? metadata.kind : expectedKind;
  const needsCatalogForExtras = kindForCatalog === PageKind.Year;
  const metaPrimaryReady = documentReady;
  const catalogExtrasReady = catalogReady;
  const editorWriteReady = documentReady;

  const stackKind = metaPrimaryReady ? metadata.kind : expectedKind;
  const showDegreeFullName = stackKind === "degree";

  const showYearCoursesEditor =
    metaPrimaryReady && catalogExtrasReady && metadata.kind === PageKind.Year;
  const showCorrelativasEditor =
    metaPrimaryReady && catalogExtrasReady && metadata.kind === PageKind.Course;
  const showCourseCatalogPending =
    metaPrimaryReady && isCourse && !catalogExtrasReady;
  const showCatalogExtrasPending =
    metaPrimaryReady && needsCatalogForExtras && !catalogExtrasReady;
  const showConceptCourseSection =
    metaPrimaryReady && metadata.kind === PageKind.Concept;
  const showCourseYearPageSection =
    metaPrimaryReady && metadata.kind === PageKind.Course;
  const catalogBacklinkLinksReady = catalogExtrasReady && allSources.length > 0;

  const courseSlugChoices = useMemo(() => {
    const slugs = new Set(coursePages.map((course) => course.slug));
    for (const slug of metadata.courses) {
      slugs.add(slug);
    }
    for (const slug of metadata.coursesNoEstructurado) {
      slugs.add(slug);
    }
    return [...slugs].sort((left, right) =>
      courseTitleBySlug(coursePages, left).localeCompare(
        courseTitleBySlug(coursePages, right),
        "es-AR",
      ),
    );
  }, [coursePages, metadata.courses]);

  const formatCourseLabel = useMemo(
    () => (slug: string) => courseTitleBySlug(coursePages, slug),
    [coursePages],
  );

  const openCoursePageFromChip = useMemo(() => {
    const slugSet = new Set(coursePages.map((course) => course.slug));
    const slugByTitle = new Map(
      coursePages.map((course) => [normalizeTitle(course.title), course.slug] as const),
    );
    return (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      const slug = slugSet.has(trimmed)
        ? trimmed
        : slugByTitle.get(normalizeTitle(trimmed));
      if (slug) {
        onOpenPage(slug);
      }
    };
  }, [coursePages, onOpenPage]);

  const degreeYearPages = useMemo(() => {
    if (stackKind !== PageKind.Degree || !metaPrimaryReady) {
      return [];
    }
    const degreeSlug = pageSlug.trim();
    const yearsCount = metadata.yearsCount;
    if (!degreeSlug || !yearsCount || yearsCount < 1) {
      return [];
    }
    const entries: Array<{ slug: string; label: string; listed: boolean }> = [];
    for (let yearIndex = 1; yearIndex <= yearsCount; yearIndex += 1) {
      const slug = buildYearSlug(degreeSlug, yearIndex);
      entries.push({
        slug,
        label: yearDisplayLabel(yearIndex),
        listed: listedPageSlugs.has(slug),
      });
    }
    return entries;
  }, [
    listedPageSlugs,
    metaPrimaryReady,
    metadata.yearsCount,
    pageSlug,
    stackKind,
  ]);

  const linkedDegreeSlug = useMemo(() => {
    const parsed = parseYearSlug(pageSlug);
    if (parsed?.degreeSlug) {
      return parsed.degreeSlug;
    }
    const degreeKey = metadata.degree?.trim();
    if (!degreeKey) {
      return "";
    }
    return degreeSlugByTitle.get(degreeKey) ?? "";
  }, [degreeSlugByTitle, metadata.degree, pageSlug]);

  const yearDegreeLabelPending = useMemo(() => {
    if (!catalogReady) {
      return true;
    }
    const degreeKey = metadata.degree?.trim();
    if (!degreeKey) {
      return false;
    }
    return !degreeDisplayByTitle.has(degreeKey);
  }, [catalogReady, degreeDisplayByTitle, metadata.degree]);

  const yearDegreeLabel = useMemo(() => {
    const degreeKey = metadata.degree?.trim();
    if (!degreeKey) {
      return "—";
    }
    return degreeDisplayByTitle.get(degreeKey) ?? "—";
  }, [degreeDisplayByTitle, metadata.degree]);

  const isDegreeStack = stackKind === PageKind.Degree;
  const isConceptStack = stackKind === PageKind.Concept;
  const isCourseStack = stackKind === PageKind.Course;

  const editorCatalogGraph = useMemo(() => {
    const patchedSources = allSources.map((page) => {
      const fileSlug = page.path.replace(/\.md$/i, "");
      if (!metaPrimaryReady || fileSlug !== pageSlug) {
        return page;
      }
      return {
        ...page,
        content: composePageDocument({ ...metadata, slug: pageSlug }, body),
      };
    });
    return buildEditorCatalogGraph([...patchedSources], resources);
  }, [allSources, body, metaPrimaryReady, metadata, pageSlug, resources]);

  const courseYearPageLinks = useMemo(() => {
    if (!catalogExtrasReady || stackKind !== PageKind.Course) {
      return [];
    }
    return yearPagesForCourseInSources(
      allSources,
      pageSlug,
      metadata.title,
      coursePages,
      listedPageSlugs,
      pageTitlesBySlug,
    );
  }, [
    allSources,
    catalogExtrasReady,
    coursePages,
    listedPageSlugs,
    metadata.title,
    pageSlug,
    pageTitlesBySlug,
    stackKind,
  ]);

  const conceptCourseLinks = useMemo(() => {
    if (!catalogExtrasReady || stackKind !== PageKind.Concept) {
      return [];
    }
    return coursesForConceptInGraph(editorCatalogGraph, pageSlug, metadata.title);
  }, [catalogExtrasReady, editorCatalogGraph, metadata.title, pageSlug, stackKind]);

  const courseConceptLinks = useMemo(() => {
    if (!catalogExtrasReady || stackKind !== PageKind.Course) {
      return [];
    }
    return conceptsForCourseInGraph(editorCatalogGraph, pageSlug, metadata.title);
  }, [catalogExtrasReady, editorCatalogGraph, metadata.title, pageSlug, stackKind]);

  return (
    <fieldset className="cms__meta">
      <legend className="u-visually-hidden">Metadatos</legend>
      <h2 className="cms__section-title">Metadatos</h2>
      <div className="cms__meta-grid">
        <div
          className={[
            "cms__meta-primary-stack",
            "cms__meta-field--full",
            isDegreeStack ? "cms__meta-primary-stack--degree" : "",
            isConceptStack ? "cms__meta-primary-stack--concept" : "",
            isCourseStack ? "cms__meta-primary-stack--course" : "",
            !metaPrimaryReady ? "cms__meta-primary-stack--pending" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-busy={!metaPrimaryReady}
        >
          {!metaPrimaryReady ? (
            <MetaPrimaryStackSkeleton />
          ) : (
            <>
              <div
                className={[
                  "cms__meta-field",
                  "cms__meta-field--full",
                  "cms__meta-title-row",
                  wideTitleInput ? "cms__meta-title-row--wide-title" : "",
                  isCourse ? "cms__meta-title-row--course" : "",
                  isDegree ? "cms__meta-title-row--degree" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
              <div className="cms__meta-title-head">
                <span className="cms__meta-label">{isYear ? "Nombre" : "Título"}</span>
                <span
                  className="cms__meta-slug"
                  title={
                    isYear
                      ? "Identificador en Storage (no editable)"
                      : "Slug en Storage (nombre del archivo)"
                  }
                >
                  Slug: {pageSlug || "…"}
                </span>
              </div>
              {isDegree ? (
                <span className="cms__meta-label cms__meta-years-count-label">Cantidad de años</span>
              ) : null}
              {isYear ? (
                <span className="cms__meta-label cms__meta-degree-label">Carrera</span>
              ) : null}
              {isYear ? (
                <span className="cms__meta-label cms__meta-year-index-label">Etiqueta</span>
              ) : null}
              <span className="cms__meta-label cms__meta-kind-label">Tipo</span>
              <input
                className="cms__meta-input cms__meta-title-input"
                type="text"
                value={metadata.title}
                onChange={(event) => patch({ title: event.target.value })}
                spellCheck={false}
                autoComplete="off"
                aria-label={isYear ? "Nombre de la página" : "Título"}
              />
              {isDegree ? (
                <input
                  className="cms__meta-input cms__meta-years-count-input"
                  type="number"
                  min={1}
                  max={20}
                  value={metadata.yearsCount ?? ""}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    patch({
                      yearsCount: Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined,
                    });
                  }}
                  aria-label="Cantidad de años"
                />
              ) : null}
              {isYear ? (
                yearDegreeLabelPending ? (
                  <div
                    className="cms__meta-degree-display-wrap cms__meta-degree-display-wrap--pending"
                    aria-busy="true"
                    aria-label="Carrera"
                  >
                    <MetaDegreeDisplaySkeleton />
                  </div>
                ) : (
                  <div className="cms__meta-degree-display-wrap">
                    <span
                      className="cms__depends-on-chip cms__depends-on-chip--meta-readonly"
                      aria-label="Carrera"
                    >
                      {linkedDegreeSlug ? (
                        <button
                          type="button"
                          className="cms__depends-on-chip-label cms__depends-on-chip-open cms__depends-on-chip-label--meta-degree"
                          onClick={() => onOpenPage(linkedDegreeSlug)}
                          title="Editar carrera en el CMS"
                        >
                          {yearDegreeLabel}
                        </button>
                      ) : (
                        <span className="cms__depends-on-chip-label cms__depends-on-chip-label--meta-degree">
                          {yearDegreeLabel}
                        </span>
                      )}
                    </span>
                  </div>
                )
              ) : null}
              {isYear ? (
                <p className="cms__meta-static-value cms__meta-year-display" aria-label="Etiqueta del año">
                  {metadata.yearIndex ? yearDisplayLabel(metadata.yearIndex) : "—"}
                </p>
              ) : null}
              {isYear ? (
                <p className="cms__meta-static-value cms__meta-kind-display" aria-label="Tipo">
                  {KIND_LABELS.year}
                </p>
              ) : (
                <MetaDropdown
                  className="cms__meta-kind-select"
                  value={metadata.kind}
                  options={kindOptions}
                  onChange={(kind) => patch({ kind })}
                  ariaLabel="Tipo"
                />
              )}
              {isCourse ? (
                <>
                  <span className="cms__meta-label cms__meta-correlativas-label">Correlativas:</span>
                  {showCourseCatalogPending ? (
                    <p className="cms__catalog-pending cms__meta-correlativas-wrap" role="status">
                      Cargando el catálogo para correlativas…
                    </p>
                  ) : showCorrelativasEditor ? (
                    <div className="cms__meta-correlativas-wrap cms__meta-field--overlay">
                      <DependsOnCombobox
                        key={`correlativas-${dependsOnResetKey}`}
                        listboxId="cms-correlativas-dropdown"
                        choices={correlativasChoices}
                        selected={metadata.correlativas}
                        onChange={(correlativas) => patch({ correlativas })}
                        placeholderEmpty="Buscar materias para agregar…"
                        placeholderMore="Agregar otra…"
                        emptyWhenFiltered="Ninguna materia coincide."
                        emptyWhenAllSelected="Ya están seleccionadas todas las materias."
                        inputAriaLabel="Agregar correlativas"
                        onChipActivate={openCoursePageFromChip}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
              </div>

              {showCourseYearPageSection ? (
                <div className="cms__meta-course-extra" aria-busy={!catalogBacklinkLinksReady}>
                  <div className="cms__meta-course-backlinks">
                    <div className="cms__meta-field cms__meta-field--full cms__meta-course-years">
                      <span className="cms__meta-label">Páginas de año</span>
                      {!catalogBacklinkLinksReady ? (
                        <MetaCatalogLinkRowSkeleton />
                      ) : (
                        <div className="cms__meta-degree-year-links" role="list">
                          {courseYearPageLinks.map(({ slug, label, listed, title }) => (
                            <button
                              key={slug}
                              type="button"
                              role="listitem"
                              className={[
                                "cms__meta-degree-year-link",
                                listed ? "" : "cms__meta-degree-year-link--pending",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => onOpenPage(slug)}
                              title={listed ? title : "La página de año no está en Storage"}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="cms__meta-field cms__meta-field--full cms__meta-course-concepts">
                      <span className="cms__meta-label">Conceptos</span>
                      {!catalogBacklinkLinksReady ? (
                        <MetaCatalogLinkRowSkeleton />
                      ) : (
                        <div className="cms__meta-degree-year-links" role="list">
                          {courseConceptLinks.map(({ slug, title }) => (
                            <button
                              key={slug}
                              type="button"
                              role="listitem"
                              className="cms__meta-degree-year-link"
                              onClick={() => onOpenPage(slug)}
                              title={`Abrir ${title} en el editor`}
                            >
                              {title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {showConceptCourseSection ? (
                <div className="cms__meta-concept-extra" aria-busy={!catalogBacklinkLinksReady}>
                  <div className="cms__meta-field cms__meta-field--full cms__meta-concept-courses">
                    <span className="cms__meta-label">Materias</span>
                    {!catalogBacklinkLinksReady ? (
                      <MetaCatalogLinkRowSkeleton />
                    ) : (
                      <div className="cms__meta-degree-year-links" role="list">
                        {conceptCourseLinks.map(({ slug, title }) => (
                          <button
                            key={slug}
                            type="button"
                            role="listitem"
                            className="cms__meta-degree-year-link"
                            onClick={() => onOpenPage(slug)}
                            title={`Abrir ${title} en el editor`}
                          >
                            {title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {showDegreeFullName ? (
                <div className="cms__meta-degree-extra">
                  <div className="cms__meta-field cms__meta-field--full cms__meta-fullname-field cms__meta-fullname-field--compact">
                    <span className="cms__meta-label">Nombre completo</span>
                    <input
                      className="cms__meta-input"
                      type="text"
                      value={metadata.fullName}
                      onChange={(event) => patch({ fullName: event.target.value })}
                      spellCheck={false}
                      autoComplete="off"
                      aria-label="Nombre completo"
                    />
                  </div>
                  {degreeYearPages.length > 0 ? (
                    <div className="cms__meta-field cms__meta-field--full cms__meta-degree-years">
                      <span className="cms__meta-label">Páginas de año</span>
                      <div className="cms__meta-degree-year-links" role="list">
                        {degreeYearPages.map(({ slug, label, listed }) => (
                          <button
                            key={slug}
                            type="button"
                            role="listitem"
                            className={[
                              "cms__meta-degree-year-link",
                              listed ? "" : "cms__meta-degree-year-link--pending",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => onOpenPage(slug)}
                            title={
                              listed
                                ? `Abrir ${label} en el editor`
                                : "Guardá la carrera para crear esta página de año en Storage"
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="cms__meta-extra-slot">
                {showCatalogExtrasPending ? (
                  <p className="cms__catalog-pending" role="status">
                    Cargando el catálogo de materias…
                  </p>
                ) : null}
                {showYearCoursesEditor ? (
                  <div className="cms__meta-year-trayectos">
                    <div className="cms__meta-field cms__meta-field--full cms__meta-field--overlay">
                      <span className="cms__meta-label">Trayecto Principal</span>
                      <DependsOnCombobox
                        key={`courses-principal-${dependsOnResetKey}`}
                        listboxId="cms-year-courses-principal-dropdown"
                        choices={courseSlugChoices.filter(
                          (slug) => !metadata.coursesNoEstructurado.includes(slug),
                        )}
                        selected={metadata.courses}
                        formatChoiceLabel={formatCourseLabel}
                        onChange={(courses) => patchYearCourseList("courses", courses)}
                        placeholderEmpty="Buscar materias para agregar…"
                        placeholderMore="Agregar otra materia…"
                        emptyWhenFiltered="Ninguna materia coincide."
                        emptyWhenAllSelected="Ya están seleccionadas todas las materias."
                        inputAriaLabel="Agregar materias al Trayecto Principal"
                        onChipActivate={openCoursePageFromChip}
                        chipDragGroup="year-trayecto"
                        chipDragListId="courses"
                        onChipMoveFromList={(slug, fromListId) => {
                          if (fromListId === "coursesNoEstructurado") {
                            moveYearCourseBetweenTrayectos(slug, fromListId);
                          }
                        }}
                      />
                    </div>
                    <div className="cms__meta-field cms__meta-field--full cms__meta-field--overlay">
                      <span className="cms__meta-label">Trayecto No Estructurado</span>
                      <DependsOnCombobox
                        key={`courses-tne-${dependsOnResetKey}`}
                        listboxId="cms-year-courses-tne-dropdown"
                        choices={courseSlugChoices.filter((slug) => !metadata.courses.includes(slug))}
                        selected={metadata.coursesNoEstructurado}
                        formatChoiceLabel={formatCourseLabel}
                        onChange={(coursesNoEstructurado) =>
                          patchYearCourseList("coursesNoEstructurado", coursesNoEstructurado)
                        }
                        placeholderEmpty="Buscar materias para agregar…"
                        placeholderMore="Agregar otra materia…"
                        emptyWhenFiltered="Ninguna materia coincide."
                        emptyWhenAllSelected="Ya están seleccionadas todas las materias."
                        inputAriaLabel="Agregar materias al Trayecto No Estructurado"
                        onChipActivate={openCoursePageFromChip}
                        chipDragGroup="year-trayecto"
                        chipDragListId="coursesNoEstructurado"
                        onChipMoveFromList={(slug, fromListId) => {
                          if (fromListId === "courses") {
                            moveYearCourseBetweenTrayectos(slug, fromListId);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}

              </div>
            </>
          )}
        </div>
      </div>
      <div className="cms__content-section" aria-busy={!editorWriteReady}>
        <h2 className="cms__section-title">Contenido</h2>
        {!editorWriteReady ? (
          <ContentEditorSkeleton />
        ) : (
          <BodyEditor
            value={body}
            resources={resources}
            concepts={conceptPages}
            pageLinks={pageLinks}
            currentPageTitle={metadata.title}
            enableConceptHashtags={metadata.kind === PageKind.Course}
            enablePageWikilinks={!isDegree && !isYear}
            historyKey={pageSlug}
            onChange={onBodyChange}
          />
        )}
      </div>
    </fieldset>
  );
}
