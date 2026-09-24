import { useEffect, useMemo, useRef, useState } from "react";

import {
  emptyPlanningPlan,
  normalizePlanningPlan,
  PLANNING_WEEK_COUNT,
  type PlanningPlanDocument,
  type PlanningWeek,
} from "@pps/content";
import {
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  shouldRecheckEntityAfterAnalyticsAdvance,
  triggerAnalyticsRebuild,
} from "@pps/content/browser";
import {
  conceptTitlesLinkedToCourse,
  normalizeTitle,
  PageKind,
  parsePages,
  type ZettelPage,
} from "@pps/core";
import { useAppAdmin } from "@pps/login/AppAdminContext";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { MetaDropdown } from "@pps/shell/MetaDropdown";
import { WorkspaceNavLink } from "@pps/shell/WorkspaceNavLink";
import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import { siteRootFromEnv } from "@pps/shell/site-root";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import refreshSvg from "@pps/shell/assets/icons/ui-refresh.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import { loadPageSources, loadPlan, savePlan } from "./api";
import {
  PLANNING_REBUILD_STATUS_POLL,
  resolvePlanningHeaderIndicatorOverride,
  resolvePlanningSaveBlockReason,
} from "./catalog-sync";
import { ConceptCombobox } from "./ConceptCombobox";
import {
  cmsCoursePageHref,
  degreeSlugForCoursePage,
  networkCourseExpansionHref,
  roadmapCourseSubgraphHref,
} from "./course-links";
import {
  buildCourseDropdownOptions,
  buildDegreeDropdownOptions,
  selectableCourseSlugsFromOptions,
} from "./planning-course-catalog";
import { readCourseParam, readDegreeParam, writePlanningUrlParams } from "./course-param";

interface CatalogItem {
  slug: string;
  title: string;
}

type WeekColumn = keyof PlanningWeek;

function planSnapshot(plan: PlanningPlanDocument | null): string {
  return JSON.stringify(plan ? normalizePlanningPlan(plan) : emptyPlanningPlan());
}

function PlanHeadRow() {
  return (
    <tr>
      <th className="planning__week-col" scope="col">
        Semana
      </th>
      <th scope="col">Tema</th>
      <th scope="col">Prerequisito</th>
      <th scope="col">Opcional</th>
    </tr>
  );
}

function PlanTableSkeleton() {
  return (
    <div className="planning__table-wrap planning__table-wrap--loading" aria-hidden="true">
      <table className="planning__table">
        <thead>
          <PlanHeadRow />
        </thead>
        <tbody>
          {Array.from({ length: PLANNING_WEEK_COUNT }, (_, index) => (
            <tr key={index}>
              <th className="planning__week-col" scope="row">
                {index + 1}
              </th>
              {(["topic", "prerequisite", "optional"] as const).map((column) => (
                <td className="planning__cell planning__cell--concept planning__cell--skeleton" key={column}>
                  <div className="planning__cell-skeleton-fill">
                    <span className="planning__skeleton planning__skeleton--cell" />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConceptLabels({
  slugs,
  labels,
}: {
  slugs: string[];
  labels: Map<string, string>;
}) {
  if (slugs.length === 0) {
    return <span className="planning__labels-empty">—</span>;
  }

  return (
    <ul className="planning__labels">
      {slugs.map((slug) => (
        <li className="planning__chip planning__chip--label" key={slug}>
          {labels.get(slug) ?? slug}
        </li>
      ))}
    </ul>
  );
}

export function App() {
  const { isAdmin } = useAppAdmin();
  const [pages, setPages] = useState<ZettelPage[]>([]);
  const [courses, setCourses] = useState<CatalogItem[]>([]);
  const [concepts, setConcepts] = useState<CatalogItem[]>([]);
  const [linkedConceptSlugsByCourse, setLinkedConceptSlugsByCourse] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [degreeSlug, setDegreeSlug] = useState(() => readDegreeParam() ?? "");
  const [courseSlug, setCourseSlug] = useState("");
  const [plan, setPlan] = useState<PlanningPlanDocument>(emptyPlanningPlan);
  const [loadedCourseSlug, setLoadedCourseSlug] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entityStale, setEntityStale] = useState(false);
  const [awaitingOwnRebuild, setAwaitingOwnRebuild] = useState(false);
  const [cloudSaveIndicatorAt, setCloudSaveIndicatorAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rebuildStatus = useAnalyticsRebuildStatus(PLANNING_REBUILD_STATUS_POLL);
  const requestRef = useRef(0);
  const rebuildStatusRef = useRef(rebuildStatus);
  const acknowledgedLastOkAtRef = useRef<string | null>(null);
  const entityServerBaselineRef = useRef("");
  const entityBaselineSyncedAtRef = useRef<string | null>(null);
  const ownRebuildBaselineLastOkAtRef = useRef<string | null>(null);
  const sawOwnRebuildRunningRef = useRef(false);
  const pendingCloudSaveAtRef = useRef<string | null>(null);

  const conceptLabels = useMemo(
    () => new Map(concepts.map((concept) => [concept.slug, concept.title])),
    [concepts],
  );
  const conceptChoices = useMemo(() => concepts.map((concept) => concept.slug), [concepts]);
  const degreeOptions = useMemo(() => buildDegreeDropdownOptions(pages), [pages]);
  const courseOptions = useMemo(
    () => buildCourseDropdownOptions(pages, courses, degreeSlug),
    [courses, degreeSlug, pages],
  );
  const selectableCourseSlugs = useMemo(
    () => selectableCourseSlugsFromOptions(courseOptions),
    [courseOptions],
  );
  const siteRoot = useMemo(
    () => siteRootFromEnv(import.meta.env.BASE_URL ?? "/planning/"),
    [],
  );
  const cmsCourseHref = useMemo(
    () => (courseSlug ? cmsCoursePageHref(siteRoot, courseSlug) : null),
    [courseSlug, siteRoot],
  );
  const networkCourseHref = useMemo(
    () => (courseSlug ? networkCourseExpansionHref(siteRoot, courseSlug) : null),
    [courseSlug, siteRoot],
  );
  const roadmapCourseHref = useMemo(() => {
    if (!courseSlug) {
      return null;
    }
    const degreeSlug = degreeSlugForCoursePage(pages, courseSlug);
    if (!degreeSlug) {
      return null;
    }
    return roadmapCourseSubgraphHref(siteRoot, degreeSlug, courseSlug);
  }, [courseSlug, pages, siteRoot]);

  useEffect(() => {
    void loadPageSources()
      .then((sources) => {
        const parsedPages = parsePages(sources);
        setPages(parsedPages);
        const coursePages = parsedPages.filter((page) => page.kind === PageKind.Course);
        const conceptPages = parsedPages.filter((page) => page.kind === PageKind.Concept);
        const nextCourses = coursePages.map(({ slug, title }) => ({ slug, title }));
        const nextConcepts = conceptPages.map(({ slug, title }) => ({ slug, title }));
        const conceptTitles = new Set(conceptPages.map((page) => page.normalizedTitle));
        const conceptSlugByTitle = new Map(
          conceptPages.map((page) => [page.normalizedTitle, page.slug] as const),
        );
        setLinkedConceptSlugsByCourse(
          new Map(
            coursePages.map((course) => [
              course.slug,
              new Set(
                conceptTitlesLinkedToCourse(course, conceptTitles).flatMap((title) => {
                  const slug = conceptSlugByTitle.get(normalizeTitle(title));
                  return slug ? [slug] : [];
                }),
              ),
            ]),
          ),
        );
        setCourses(nextCourses);
        setConcepts(nextConcepts);

        const degrees = buildDegreeDropdownOptions(parsedPages);
        const fromDegree = readDegreeParam();
        const initialDegree =
          fromDegree && degrees.some((degree) => degree.value === fromDegree) ? fromDegree : "";
        const initialCourseOptions = buildCourseDropdownOptions(
          parsedPages,
          nextCourses,
          initialDegree,
        );
        const initialSlugs = selectableCourseSlugsFromOptions(initialCourseOptions);
        const fromCourse = readCourseParam();
        const initialCourse =
          fromCourse && initialSlugs.includes(fromCourse)
            ? fromCourse
            : (initialSlugs[0] ?? "");

        setDegreeSlug(initialDegree);
        setCourseSlug(initialCourse);
        writePlanningUrlParams(initialCourse, initialDegree, "replace");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (catalogLoading) {
      return;
    }

    if (selectableCourseSlugs.length === 0) {
      if (courseSlug) {
        setCourseSlug("");
      }
      writePlanningUrlParams("", degreeSlug, "replace");
      return;
    }

    if (!courseSlug || !selectableCourseSlugs.includes(courseSlug)) {
      const nextCourse = selectableCourseSlugs[0]!;
      setCourseSlug(nextCourse);
      writePlanningUrlParams(nextCourse, degreeSlug, "replace");
    }
  }, [catalogLoading, courseSlug, degreeSlug, selectableCourseSlugs]);

  useEffect(() => {
    const onPopState = (): void => {
      setDegreeSlug(readDegreeParam() ?? "");
      setCourseSlug(readCourseParam() ?? "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!courseSlug) {
      return;
    }
    const request = ++requestRef.current;
    setPlanLoading(true);
    setLoadedCourseSlug("");
    setEntityStale(false);
    setCloudSaveIndicatorAt(null);
    setMessage(null);
    void loadPlan(courseSlug)
      .then((loaded) => {
        if (request !== requestRef.current) {
          return;
        }
        const nextPlan = loaded ? normalizePlanningPlan(loaded) : emptyPlanningPlan();
        entityServerBaselineRef.current = planSnapshot(nextPlan);
        entityBaselineSyncedAtRef.current = new Date().toISOString();
        setPlan(nextPlan);
        setLoadedCourseSlug(courseSlug);
      })
      .catch((error) => {
        if (request === requestRef.current) {
          setMessage(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (request === requestRef.current) {
          setPlanLoading(false);
        }
      });
  }, [courseSlug]);

  useEffect(() => {
    rebuildStatusRef.current = rebuildStatus;
  }, [rebuildStatus]);

  useEffect(() => {
    const lastOkAt = rebuildStatus?.lastOkAt ?? null;
    if (lastOkAt && !acknowledgedLastOkAtRef.current) {
      acknowledgedLastOkAtRef.current = lastOkAt;
    }
  }, [rebuildStatus?.lastOkAt]);

  useEffect(() => {
    const lastOkAt = rebuildStatus?.lastOkAt ?? null;

    if (awaitingOwnRebuild) {
      if (rebuildStatus?.state === "running") {
        sawOwnRebuildRunningRef.current = true;
      }
      if (
        isOwnAnalyticsRebuildComplete(
          rebuildStatus,
          ownRebuildBaselineLastOkAtRef.current,
          sawOwnRebuildRunningRef.current,
        )
      ) {
        if (lastOkAt) {
          acknowledgedLastOkAtRef.current = lastOkAt;
        }
        sawOwnRebuildRunningRef.current = false;
        setAwaitingOwnRebuild(false);
        setCloudSaveIndicatorAt(pendingCloudSaveAtRef.current ?? new Date().toISOString());
        pendingCloudSaveAtRef.current = null;
        setEntityStale(false);
      }
      return;
    }

    if (
      !courseSlug ||
      loadedCourseSlug !== courseSlug ||
      catalogLoading ||
      planLoading ||
      saving ||
      !shouldRecheckEntityAfterAnalyticsAdvance({
        lastOkAt,
        acknowledgedLastOkAt: acknowledgedLastOkAtRef.current,
        awaitingOwnRebuild: false,
      })
    ) {
      return;
    }

    let cancelled = false;
    void loadPlan(courseSlug).then((remote) => {
      if (cancelled) {
        return;
      }
      const checkpoint = rebuildStatusRef.current?.lastOkAt ?? lastOkAt;
      if (isEntityContentStale(planSnapshot(remote), entityServerBaselineRef.current)) {
        setEntityStale(true);
        setCloudSaveIndicatorAt(null);
      } else if (checkpoint) {
        acknowledgedLastOkAtRef.current = checkpoint;
        setEntityStale(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    awaitingOwnRebuild,
    catalogLoading,
    courseSlug,
    loadedCourseSlug,
    planLoading,
    rebuildStatus,
    saving,
  ]);

  useEffect(() => {
    if (!awaitingOwnRebuild) {
      return;
    }
    const timeout = window.setTimeout(() => {
      const status = rebuildStatusRef.current;
      if (status?.lastOkAt) {
        acknowledgedLastOkAtRef.current = status.lastOkAt;
      }
      sawOwnRebuildRunningRef.current = false;
      setAwaitingOwnRebuild(false);
      setEntityStale(false);
    }, 120_000);
    return () => window.clearTimeout(timeout);
  }, [awaitingOwnRebuild]);

  const hasUnsavedChanges = useMemo(() => {
    if (!courseSlug || loadedCourseSlug !== courseSlug || entityStale) {
      return false;
    }
    const baseline = entityServerBaselineRef.current;
    if (!baseline) {
      return false;
    }
    return planSnapshot(plan) !== baseline;
  }, [courseSlug, entityStale, loadedCourseSlug, plan, saving]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent): void {
      if (hasUnsavedChanges) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function selectDegree(nextDegree: string): void {
    if (hasUnsavedChanges && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) {
      return;
    }
    const nextCourseOptions = buildCourseDropdownOptions(pages, courses, nextDegree);
    const nextSlugs = selectableCourseSlugsFromOptions(nextCourseOptions);
    const nextCourse =
      courseSlug && nextSlugs.includes(courseSlug) ? courseSlug : (nextSlugs[0] ?? "");
    setDegreeSlug(nextDegree);
    setCourseSlug(nextCourse);
    writePlanningUrlParams(nextCourse, nextDegree, "push");
  }

  function selectCourse(nextSlug: string): void {
    if (hasUnsavedChanges && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) {
      return;
    }
    setCourseSlug(nextSlug);
    writePlanningUrlParams(nextSlug, degreeSlug, "push");
  }

  function discardPlanChanges(): void {
    if (!hasUnsavedChanges) {
      return;
    }
    const baseline = entityServerBaselineRef.current;
    if (!baseline) {
      return;
    }
    setPlan(normalizePlanningPlan(JSON.parse(baseline) as PlanningPlanDocument));
    setMessage(null);
  }

  function updateWeek(index: number, column: WeekColumn, values: string[]): void {
    setPlan((current) => ({
      ...current,
      weeks: current.weeks.map((week, weekIndex) =>
        weekIndex === index ? { ...week, [column]: values } : week,
      ),
    }));
    setMessage(null);
  }

  async function handleSave(): Promise<void> {
    if (!courseSlug || entityStale) {
      return;
    }
    setSaving(true);
    setCloudSaveIndicatorAt(null);
    setMessage(null);
    try {
      const remote = await loadPlan(courseSlug);
      if (isEntityContentStale(planSnapshot(remote), entityServerBaselineRef.current)) {
        setEntityStale(true);
        return;
      }
      await savePlan(courseSlug, plan);
      const savedAt = new Date().toISOString();
      entityServerBaselineRef.current = planSnapshot(plan);
      entityBaselineSyncedAtRef.current = savedAt;
      pendingCloudSaveAtRef.current = savedAt;
      ownRebuildBaselineLastOkAtRef.current = rebuildStatus?.lastOkAt ?? null;
      sawOwnRebuildRunningRef.current = false;
      setAwaitingOwnRebuild(true);
      setEntityStale(false);
      triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/planning/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  const planSynced = !courseSlug || loadedCourseSlug === courseSlug;
  const contentLoading = catalogLoading || planLoading || !planSynced;
  const saveBlockReason = resolvePlanningSaveBlockReason({
    entityStale,
    catalogLoading: contentLoading,
    rebuildStatus,
    awaitingOwnRebuild,
  });
  const canSave =
    saveBlockReason === null && !saving && Boolean(courseSlug) && hasUnsavedChanges;
  const headerIndicatorOverride = resolvePlanningHeaderIndicatorOverride({
    entityStale,
    savingPage: saving,
    cloudSaveIndicatorAt,
    entityBaselineSyncedAt: entityBaselineSyncedAtRef.current,
    saveBlockReason,
    awaitingOwnRebuild,
    rebuildStatus,
    hasUnsavedChanges,
  });
  const workspaceLocked =
    entityStale ||
    contentLoading ||
    isEditorWorkspaceActionsLocked({
      rebuildStatus,
      awaitingOwnRebuild,
      savingEntity: saving,
    });
  const disabled = workspaceLocked || !courseSlug;
  const linkedConceptSlugs = linkedConceptSlugsByCourse.get(courseSlug) ?? new Set<string>();
  const statusAlert = message;
  const effectiveHeaderOverride = statusAlert
    ? { phase: "unknown" as const, label: statusAlert }
    : headerIndicatorOverride;
  const statusIsAlert = entityStale || Boolean(statusAlert);

  return (
    <div className="dashboard__content planning">
      <div className="planning__workspace">
        <header className="planning__header">
          <div className="dashboard__header-top planning__header-top">
            <div className="dashboard__header-title-band">
              <div className="planning__header-title-row dashboard__header-title-row">
                <h1 className="dashboard__header-title">Programa semanal</h1>
                <div className="planning__header-status-cluster">
                  <AnalyticsRebuildIndicator
                    status={rebuildStatus}
                    className={
                      statusIsAlert
                        ? "planning__rebuild-indicator planning__rebuild-indicator--stale"
                        : "planning__rebuild-indicator"
                    }
                    loading={contentLoading && !effectiveHeaderOverride}
                    override={effectiveHeaderOverride}
                    role={statusIsAlert ? "alert" : "status"}
                  />
                </div>
              </div>
              {entityStale ? (
                <div className="planning__header-actions dashboard__header-actions">
                  <button
                    className="planning__button planning__button--save planning__button--refresh"
                    type="button"
                    title="Recargar la página"
                    aria-label="Recargar la página para obtener el programa actualizado"
                    onClick={() => window.location.reload()}
                  >
                    <SvgAssetIcon
                      svg={refreshSvg}
                      className="planning__button-icon"
                      focusable={false}
                    />
                    Recargar
                  </button>
                </div>
              ) : isAdmin ? (
                <div className="planning__header-actions dashboard__header-actions">
                  <button
                    className="planning__button planning__button--secondary planning__button--icon"
                    type="button"
                    disabled={!hasUnsavedChanges || workspaceLocked}
                    title="Descartar cambios"
                    aria-label="Descartar cambios y volver al programa del servidor"
                    onClick={discardPlanChanges}
                  >
                    <SvgAssetIcon
                      svg={refreshSvg}
                      className="planning__button-icon"
                      focusable={false}
                    />
                  </button>
                  <button
                    className="planning__button planning__button--save planning__button--icon"
                    type="button"
                    disabled={!canSave}
                    title="Guardar programa"
                    aria-label="Guardar programa"
                    onClick={() => void handleSave()}
                  >
                    <SvgAssetIcon
                      svg={saveSvg}
                      className="planning__button-icon"
                      focusable={false}
                    />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="dashboard__header-lead-row">
              <p className="dashboard__header-lead">
                {isAdmin
                  ? "Organizá conceptos de cada materia en un programa de 15 semanas."
                  : "Conceptos de cada materia en un programa de 15 semanas."}
              </p>
              <div className="planning__header-workspace-links pps-workspace-nav-links">
                {isAdmin ? (
                  <WorkspaceNavLink
                    navId="cms"
                    href={cmsCourseHref}
                    disabled={catalogLoading || !courseSlug || !cmsCourseHref}
                  >
                    Editar
                  </WorkspaceNavLink>
                ) : null}
                <WorkspaceNavLink
                  navId="roadmap"
                  href={roadmapCourseHref}
                  disabled={catalogLoading || !courseSlug || !roadmapCourseHref}
                  title={
                    !catalogLoading && courseSlug && !roadmapCourseHref
                      ? "Asigná esta materia a un año en la grilla de la carrera para abrir el mapa"
                      : undefined
                  }
                >
                  Roadmap
                </WorkspaceNavLink>
                <WorkspaceNavLink
                  navId="network"
                  href={networkCourseHref}
                  disabled={catalogLoading || !courseSlug || !networkCourseHref}
                >
                  Red
                </WorkspaceNavLink>
              </div>
            </div>
          </div>
        </header>

        <div className="planning__course-row">
          <div className="planning__course-field planning__course-field--degree">
            <span className="planning__course-label">Carrera</span>
            {catalogLoading ? (
              <span className="planning__skeleton planning__skeleton--course" aria-hidden="true" />
            ) : (
              <MetaDropdown
                className="planning__course-dropdown"
                ariaLabel="Carrera"
                value={degreeSlug}
                options={degreeOptions}
                maxVisibleRows={12}
                disabled={workspaceLocked}
                onChange={selectDegree}
              />
            )}
          </div>
          <div className="planning__course-field">
            <span className="planning__course-label">Materia</span>
            {catalogLoading ? (
              <span className="planning__skeleton planning__skeleton--course" aria-hidden="true" />
            ) : (
              <MetaDropdown
                className="planning__course-dropdown"
                ariaLabel="Materia"
                value={courseSlug}
                options={courseOptions}
                maxVisibleRows={15}
                disabled={workspaceLocked || selectableCourseSlugs.length === 0}
                onChange={selectCourse}
              />
            )}
          </div>
        </div>

        <div className="planning__body">
          {!contentLoading && courses.length === 0 && !statusAlert ? (
            <p className="planning__message" role="status">No hay materias disponibles.</p>
          ) : null}

          {contentLoading ? (
            <>
              <span className="u-visually-hidden" role="status">
                Cargando el programa…
              </span>
              <PlanTableSkeleton />
            </>
          ) : courseSlug ? (
            <div className="planning__table-wrap">
              <table className="planning__table">
                <thead>
                  <PlanHeadRow />
                </thead>
                <tbody>
                  {plan.weeks.map((week, index) => (
                    <tr key={index}>
                      <th className="planning__week-col" scope="row">
                        {index + 1}
                      </th>
                      {(["topic", "prerequisite", "optional"] as const).map((column) => (
                        <td
                          className={
                            isAdmin
                              ? "planning__cell planning__cell--concept"
                              : "planning__cell planning__cell--concept planning__cell--readonly"
                          }
                          key={column}
                        >
                          {isAdmin ? (
                            <ConceptCombobox
                              id={`planning-week-${index + 1}-${column}`}
                              choices={conceptChoices}
                              selected={week[column]}
                              labels={conceptLabels}
                              linkedSlugs={linkedConceptSlugs}
                              disabled={disabled}
                              warningTitles={
                                column === "topic"
                                  ? week.topic
                                      .filter((slug) => !linkedConceptSlugs.has(slug))
                                      .map((slug) => conceptLabels.get(slug) ?? slug)
                                  : []
                              }
                              onChange={(values) => updateWeek(index, column, values)}
                            />
                          ) : (
                            <ConceptLabels slugs={week[column]} labels={conceptLabels} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
