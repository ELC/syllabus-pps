import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { triggerAnalyticsRebuild } from "@pps/content/browser";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import plusSvg from "@pps/shell/assets/icons/ui-plus.svg?raw";
import refreshSvg from "@pps/shell/assets/icons/ui-refresh.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import warningSvg from "@pps/shell/assets/icons/ui-warning.svg?raw";
import {
  listPages,
  loadAllPageSources,
  loadResources,
  readPage,
  writePage,
  type PageListItem,
} from "./api/content";
import {
  createSeverityClassNameResolver,
  hasBlockingDiagnostics,
  type PageSource,
  type ResourceCatalogEntry,
} from "@pps/core";
import { normalizeYearCourseSlugs, type CoursePageOption } from "./course-pages";
import { PageMetadataForm } from "./components/PageMetadataForm";
import { SidebarNavSkeleton } from "@pps/shell/SidebarNavSkeleton";
import { createDraftPageContent, nextDraftSlug } from "./draft-page";
import {
  composePageDocument,
  defaultPageMetadata,
  splitPageDocument,
  type PageMetadata,
} from "./page-document";
import { readPageParam, writePageParam } from "./page-param";
import { filterDiagnosticsForPage, pageHasDiagnostics } from "./validation/filterDiagnostics";
import { planDegreeYearSync } from "./degree-year-sync";
import { expectedEditorKind } from "./expected-page-kind";
import { runDiagnosticsForEditor } from "./validation/runDiagnostics";
import {
  CMS_REBUILD_STATUS_POLL,
  cmsSaveBlockMessage,
  isCmsSidebarNavReady,
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  resolveCmsHeaderIndicatorOverride,
  resolveCmsSaveBlockReason,
  shouldRecheckEntityAfterAnalyticsAdvance,
} from "./catalog-sync";

const severityClass = createSeverityClassNameResolver("cms__diagnostics-severity");

function mergeDraftSources(local: PageSource[], remote: PageSource[]): PageSource[] {
  const remoteSlugs = new Set(remote.map((page) => page.path.replace(/\.md$/i, "")));
  const drafts = local.filter((page) => !remoteSlugs.has(page.path.replace(/\.md$/i, "")));
  return [...drafts, ...remote];
}

export function App() {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [metadata, setMetadata] = useState<PageMetadata>(() => defaultPageMetadata(""));
  const [body, setBody] = useState("");
  const [savingPage, setSavingPage] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [allSources, setAllSources] = useState<Array<{ path: string; content: string }>>([]);
  const [resources, setResources] = useState<ResourceCatalogEntry[]>([]);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(() => new Set());
  const [loadedSlug, setLoadedSlug] = useState("");
  const [query, setQuery] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [entityStale, setEntityStale] = useState(false);
  const rebuildStatus = useAnalyticsRebuildStatus(CMS_REBUILD_STATUS_POLL);
  const sourcesFetchGenerationRef = useRef(0);
  const acknowledgedLastOkAtRef = useRef<string | null>(null);
  const entityServerBaselineRef = useRef<Map<string, string>>(new Map());
  const [awaitingOwnRebuild, setAwaitingOwnRebuild] = useState(false);
  const [cloudSaveIndicatorAt, setCloudSaveIndicatorAt] = useState<string | null>(null);
  const pendingCloudSaveAtRef = useRef<string | null>(null);
  const awaitingOwnRebuildRef = useRef(false);
  const ownRebuildBaselineLastOkAtRef = useRef<string | null>(null);
  const sawOwnRebuildRunningRef = useRef(false);
  const rebuildStatusRef = useRef(rebuildStatus);

  useEffect(() => {
    setLoadingPages(true);
    setLoadError("");
    void listPages()
      .then((items) => {
        setPages(items);
        const requested = readPageParam();
        const match = requested ? items.find((item) => item.slug === requested) : undefined;
        setSelectedSlug(match?.slug ?? items[0]?.slug ?? "");
        if (items.length === 0) {
          setLoadError("No se encontraron páginas en Supabase Storage.");
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setPages([]);
        setSelectedSlug("");
      })
      .finally(() => {
        setLoadingPages(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }
    writePageParam(selectedSlug);
  }, [selectedSlug]);

  const pageListKey = useMemo(
    () => pages.map((page) => page.slug).sort((left, right) => left.localeCompare(right, "es-AR")).join("\0"),
    [pages],
  );

  const content = useMemo(
    () => composePageDocument({ ...metadata, slug: selectedSlug }, body),
    [body, metadata, selectedSlug],
  );

  const pageLinks = useMemo(() => {
    const bySlug = new Map<string, { title: string; slug: string }>();
    for (const page of allSources) {
      const slug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, slug);
      const linkSlug = pageMeta.slug.trim() || slug;
      bySlug.set(linkSlug, { title: pageMeta.title, slug: linkSlug });
    }
    return [...bySlug.values()].sort((left, right) =>
      left.title.localeCompare(right.title, "es-AR"),
    );
  }, [allSources]);

  const conceptPages = useMemo(() => {
    const concepts: Array<{ title: string; slug: string }> = [];
    for (const page of allSources) {
      const slug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, slug);
      if (pageMeta.kind === "concept") {
        const conceptSlug = pageMeta.slug.trim() || slug;
        concepts.push({ title: pageMeta.title, slug: conceptSlug });
      }
    }
    return concepts.sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
  }, [allSources]);

  const conceptTitles = useMemo(() => conceptPages.map((page) => page.title), [conceptPages]);

  const degreeTitles = useMemo(() => {
    const titles: string[] = [];
    for (const page of allSources) {
      const slug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, slug);
      if (pageMeta.kind === "degree") {
        titles.push(pageMeta.title);
      }
    }
    return [...new Set(titles)].sort((left, right) => left.localeCompare(right, "es-AR"));
  }, [allSources]);

  const degreeDisplayByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of allSources) {
      const fileSlug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, fileSlug);
      if (pageMeta.kind !== "degree") {
        continue;
      }
      const display = pageMeta.fullName.trim() || pageMeta.title;
      map.set(pageMeta.title, display);
      const degreeSlug = pageMeta.slug.trim() || fileSlug;
      map.set(degreeSlug, display);
    }
    return map;
  }, [allSources]);

  const coursePages = useMemo((): CoursePageOption[] => {
    const courses: CoursePageOption[] = [];
    for (const page of allSources) {
      const fileSlug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, fileSlug);
      if (pageMeta.kind === "course") {
        courses.push({
          slug: pageMeta.slug.trim() || fileSlug,
          title: pageMeta.title,
        });
      }
    }
    return courses.sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
  }, [allSources]);

  const courseTitles = useMemo(() => coursePages.map((course) => course.title), [coursePages]);

  function persistDraftContent(slug: string, draftContent: string): void {
    setAllSources((sources) =>
      sources.map((page) =>
        page.path.replace(/\.md$/i, "") === slug ? { ...page, content: draftContent } : page,
      ),
    );
  }

  function loadDocumentFromSource(slug: string, source: string, serverBaseline?: string): void {
    const split = splitPageDocument(source, slug);
    const metadata =
      split.metadata.kind === "year"
        ? {
            ...split.metadata,
            courses: normalizeYearCourseSlugs(split.metadata.courses, coursePages),
          }
        : split.metadata;
    setMetadata(metadata);
    setBody(split.body);
    setLoadedSlug(slug);
    entityServerBaselineRef.current.set(slug, serverBaseline ?? source);
  }

  function selectPage(slug: string): void {
    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }
    setSelectedSlug(slug);
  }

  useEffect(() => {
    if (!selectedSlug) {
      setLoadedSlug("");
      return;
    }

    if (draftSlugs.has(selectedSlug)) {
      const draft = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
      if (draft) {
        loadDocumentFromSource(selectedSlug, draft.content);
      }
      return;
    }

    let cancelled = false;
    const cached = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
    if (cached) {
      loadDocumentFromSource(selectedSlug, cached.content);
    } else {
      setLoadedSlug("");
    }

    void readPage(selectedSlug).then((remote) => {
      if (cancelled) {
        return;
      }
      const cachedContent = cached?.content;
      if (cachedContent !== undefined && cachedContent !== remote) {
        entityServerBaselineRef.current.set(selectedSlug, remote);
        setEntityStale(true);
        setCloudSaveIndicatorAt(null);
        return;
      }
      setEntityStale(false);
      loadDocumentFromSource(selectedSlug, remote);
      if (cachedContent !== remote) {
        setAllSources((sources) =>
          sources.map((page) =>
            page.path.replace(/\.md$/i, "") === selectedSlug ? { ...page, content: remote } : page,
          ),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [coursePages, draftSlugs, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug || draftSlugs.has(selectedSlug)) {
      return;
    }
    const cached = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
    if (!cached || loadedSlug !== selectedSlug) {
      return;
    }
    const split = splitPageDocument(cached.content, selectedSlug);
    if (split.metadata.kind !== "year") {
      return;
    }
    setMetadata((current) => {
      if (current.kind !== "year") {
        return current;
      }
      const courses = normalizeYearCourseSlugs(split.metadata.courses, coursePages);
      if (
        courses.length === current.courses.length &&
        courses.every((slug, index) => slug === current.courses[index])
      ) {
        return current;
      }
      return { ...current, courses };
    });
  }, [allSources, coursePages, draftSlugs, loadedSlug, selectedSlug]);

  useEffect(() => {
    if (loadingPages) {
      return;
    }
    if (pages.length === 0) {
      setSourcesLoading(false);
      return;
    }

    const generation = ++sourcesFetchGenerationRef.current;
    setSourcesLoading(true);

    void loadAllPageSources()
      .then((sources) => {
        if (generation !== sourcesFetchGenerationRef.current) {
          return;
        }
        setAllSources((current) => mergeDraftSources(current, sources));
      })
      .catch((error: unknown) => {
        if (generation !== sourcesFetchGenerationRef.current) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setLoadError((current) => current || message);
      })
      .finally(() => {
        if (generation !== sourcesFetchGenerationRef.current) {
          return;
        }
        setSourcesLoading(false);
      });

    void loadResources().then(setResources);
  }, [loadingPages, pageListKey, pages.length]);

  useEffect(() => {
    rebuildStatusRef.current = rebuildStatus;
  }, [rebuildStatus]);

  useEffect(() => {
    awaitingOwnRebuildRef.current = awaitingOwnRebuild;
  }, [awaitingOwnRebuild]);

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
        setCloudSaveIndicatorAt(
          pendingCloudSaveAtRef.current ?? new Date().toISOString(),
        );
        pendingCloudSaveAtRef.current = null;
        setEntityStale(false);
      }
      return;
    }

    if (
      !selectedSlug ||
      loadedSlug !== selectedSlug ||
      loadingPages ||
      sourcesLoading ||
      savingPage
    ) {
      return;
    }

    if (
      !shouldRecheckEntityAfterAnalyticsAdvance({
        lastOkAt,
        acknowledgedLastOkAt: acknowledgedLastOkAtRef.current,
        awaitingOwnRebuild: false,
      })
    ) {
      return;
    }

    let cancelled = false;
    void readPage(selectedSlug).then((remote) => {
      if (cancelled) {
        return;
      }
      const baseline = entityServerBaselineRef.current.get(selectedSlug);
      const checkpoint = rebuildStatusRef.current?.lastOkAt ?? lastOkAt;
      if (!baseline || !checkpoint) {
        if (checkpoint) {
          acknowledgedLastOkAtRef.current = checkpoint;
        }
        return;
      }
      if (isEntityContentStale(remote, baseline)) {
        setEntityStale(true);
        setCloudSaveIndicatorAt(null);
      } else {
        acknowledgedLastOkAtRef.current = checkpoint;
        setEntityStale(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    awaitingOwnRebuild,
    loadedSlug,
    loadingPages,
    rebuildStatus,
    savingPage,
    selectedSlug,
    sourcesLoading,
  ]);

  useEffect(() => {
    if (!awaitingOwnRebuild) {
      return;
    }
    const timeout = setTimeout(() => {
      const status = rebuildStatusRef.current;
      if (status?.lastOkAt) {
        acknowledgedLastOkAtRef.current = status.lastOkAt;
      }
      sawOwnRebuildRunningRef.current = false;
      setAwaitingOwnRebuild(false);
      setEntityStale(false);
    }, 120_000);
    return () => clearTimeout(timeout);
  }, [awaitingOwnRebuild]);

  const diagnostics = useMemo(() => {
    if (!selectedSlug || allSources.length === 0) {
      return [];
    }
    return runDiagnosticsForEditor(selectedSlug, content, allSources, resources);
  }, [allSources, content, resources, selectedSlug]);

  const pageDiagnostics = useMemo(() => {
    if (!selectedSlug) {
      return [];
    }
    return filterDiagnosticsForPage(diagnostics, selectedSlug, content);
  }, [content, diagnostics, selectedSlug]);

  const diagnosticPageSlugs = useMemo(() => {
    if (allSources.length === 0 || diagnostics.length === 0) {
      return new Set<string>();
    }

    return new Set(
      pages
        .filter((page) =>
          pageHasDiagnostics(diagnostics, page.slug, selectedSlug, content, allSources),
        )
        .map((page) => page.slug),
    );
  }, [allSources, content, diagnostics, pages, selectedSlug]);

  const pageTitlesBySlug = useMemo(() => {
    const titles = new Map<string, string>();
    for (const page of pages) {
      const title = page.title?.trim();
      if (title) {
        titles.set(page.slug, title);
      }
    }
    for (const source of allSources) {
      const slug = source.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(source.content, slug);
      const title = pageMeta.title.trim();
      if (!title) {
        continue;
      }
      const linkSlug = pageMeta.slug.trim() || slug;
      titles.set(slug, title);
      titles.set(linkSlug, title);
    }
    return titles;
  }, [allSources, pages]);

  const filteredPages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return pages;
    }
    return pages.filter((page) => {
      const title = pageTitlesBySlug.get(page.slug) ?? "";
      return (
        page.slug.toLowerCase().includes(needle) || title.toLowerCase().includes(needle)
      );
    });
  }, [pageTitlesBySlug, pages, query]);

  const diagnosticsPending =
    loadingPages ||
    sourcesLoading ||
    (pages.length > 0 && allSources.length === 0 && !loadError);

  const catalogReady = pages.length === 0 || allSources.length > 0;
  const pageNavReady = useMemo(() => {
    if (
      !isCmsSidebarNavReady({
        loadingPages,
        pages,
        sourcesLoading,
        allSourcesLoaded: allSources.length > 0,
      })
    ) {
      return false;
    }
    return pages.every((page) => Boolean(pageTitlesBySlug.get(page.slug)?.trim()));
  }, [allSources.length, loadingPages, pageTitlesBySlug, pages, sourcesLoading]);

  const saveBlockReason = resolveCmsSaveBlockReason({
    entityStale,
    sourcesLoading: sourcesLoading || (pages.length > 0 && allSources.length === 0),
    rebuildStatus,
    awaitingOwnRebuild,
    hasBlockingDiagnostics: hasBlockingDiagnostics(pageDiagnostics),
  });

  const canSave = saveBlockReason === null && !savingPage;
  const saveBlockMessage = cmsSaveBlockMessage(saveBlockReason);
  const showSaveBlockHint =
    saveBlockReason === "diagnostics" && Boolean(saveBlockMessage) && Boolean(selectedSlug) && !diagnosticsPending;
  const headerIndicatorOverride = resolveCmsHeaderIndicatorOverride({
    entityStale,
    savingPage,
    cloudSaveIndicatorAt,
    saveBlockReason,
    awaitingOwnRebuild,
    rebuildStatus,
  });
  const workspaceLocked =
    entityStale ||
    sourcesLoading ||
    isEditorWorkspaceActionsLocked({
      rebuildStatus,
      awaitingOwnRebuild,
      savingEntity: savingPage,
    });

  const expectedKind = useMemo(
    () => expectedEditorKind(selectedSlug, allSources),
    [allSources, selectedSlug],
  );

  function addNewPage(): void {
    if (workspaceLocked) {
      return;
    }

    const slug = nextDraftSlug(pages);
    const draftContent = createDraftPageContent(slug);
    const draftTitle = splitPageDocument(draftContent, slug).metadata.title.trim() || slug;
    const path = `${slug}.md`;

    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }

    setDraftSlugs((current) => new Set(current).add(slug));
    setPages((current) => [{ slug, path, title: draftTitle }, ...current]);
    setAllSources((current) => [{ path, content: draftContent }, ...current]);
    setSelectedSlug(slug);
    loadDocumentFromSource(slug, draftContent);
    setQuery("");
    setLoadError("");
  }

  const pageNav = (
    <nav className="dashboard__nav dashboard__nav--sub" aria-label="Páginas" aria-busy={!pageNavReady}>
      <div className="dashboard__nav-subhead">
        <div className="dashboard__nav-label">Páginas</div>
        <label className="cms__search">
          <span className="dashboard__nav-field-label">Filtrar</span>
          <input
            className="cms__search-input"
            type="search"
            value={query}
            placeholder="slug o título"
            onChange={(event) => setQuery(event.target.value)}
            disabled={!pageNavReady}
          />
        </label>
      </div>
      <div
        className={
          pageNavReady
            ? "dashboard__nav-scroll-body"
            : "dashboard__nav-scroll-body dashboard__nav-scroll-body--loading"
        }
      >
        {!pageNavReady ? (
          <SidebarNavSkeleton />
        ) : (
          filteredPages.map((page) => {
          const displayTitle = pageTitlesBySlug.get(page.slug)?.trim();
          if (!displayTitle) {
            return null;
          }
          return (
            <button
              key={page.slug}
              type="button"
              className={
                page.slug === selectedSlug ? "dashboard__link dashboard__link--active" : "dashboard__link"
              }
              onClick={() => selectPage(page.slug)}
              title={displayTitle !== page.slug ? page.slug : undefined}
            >
              <span className="cms__page-link-label">{displayTitle}</span>
              {diagnosticPageSlugs.has(page.slug) ? (
                <span className="cms__page-warning" title="Tiene diagnósticos" aria-label="Tiene diagnósticos">
                  <SvgAssetIcon svg={warningSvg} className="cms__page-warning-icon" focusable={false} />
                </span>
              ) : null}
            </button>
          );
          })
        )}
      </div>
    </nav>
  );

  const sidebarExtra = document.getElementById("cms-sidebar-extra");

  return (
    <>
      {sidebarExtra ? createPortal(pageNav, sidebarExtra) : pageNav}

      <div className="dashboard__content">
      <div className="cms__workspace">
      <header className="cms__header">
        <div className="cms__header-main">
          <div className="cms__header-title-row">
            <h1 className="cms__header-title">Gestión de contenido</h1>
            <div className="cms__header-status-cluster">
              <AnalyticsRebuildIndicator
                status={rebuildStatus}
                className={
                  entityStale
                    ? "cms__rebuild-indicator cms__rebuild-indicator--stale"
                    : "cms__rebuild-indicator"
                }
                loading={loadingPages && !headerIndicatorOverride}
                override={headerIndicatorOverride}
                role={entityStale ? "alert" : "status"}
              />
              {showSaveBlockHint ? (
                <span className="cms__save-blocked-hint" role="status">
                  {saveBlockMessage}
                </span>
              ) : null}
            </div>
          </div>
          <p className="cms__header-lead">
            Los cambios guardan páginas markdown en Supabase Storage. En desarrollo local,{" "}
            <code className="cms__code">pnpm dev</code> no requiere iniciar sesión; el sitio publicado sí
            requiere autenticación.
          </p>
        </div>
        <div className="cms__header-actions">
          {entityStale ? (
            <button
              type="button"
              className="cms__button cms__button--save cms__button--refresh"
              onClick={() => window.location.reload()}
              title="Recargar la página"
              aria-label="Recargar la página para obtener el catálogo actualizado"
            >
              <SvgAssetIcon svg={refreshSvg} className="cms__button-icon" focusable={false} />
              Recargar
            </button>
          ) : (
            <>
            <button
              type="button"
              className="cms__button cms__button--secondary cms__button--icon"
              onClick={addNewPage}
              disabled={workspaceLocked}
              title="Nueva página"
              aria-label="Nueva página"
            >
              <SvgAssetIcon svg={plusSvg} className="cms__button-icon" focusable={false} />
            </button>
            <button
              type="button"
              className="cms__button cms__button--save cms__button--icon"
              disabled={!canSave || !selectedSlug}
              title="Guardar página"
              aria-label="Guardar página"
              onClick={() => {
                setSavingPage(true);
                setCloudSaveIndicatorAt(null);
                const savedAt = new Date().toISOString();
                const savedMetadata = {
                  ...metadata,
                  slug: selectedSlug,
                  updatedAt: savedAt,
                  ...(metadata.kind === "year"
                    ? { courses: normalizeYearCourseSlugs(metadata.courses, coursePages) }
                    : {}),
                };
                const savedContent = composePageDocument(savedMetadata, body);

                const sourcesForSync = allSources.map((page) =>
                  page.path.replace(/\.md$/i, "") === selectedSlug
                    ? { ...page, content: savedContent }
                    : page,
                );
                const syncPlan =
                  savedMetadata.kind === "degree"
                    ? planDegreeYearSync(savedMetadata, selectedSlug, sourcesForSync)
                    : null;

                const persistMain = writePage(selectedSlug, savedContent);
                const persistYears =
                  syncPlan?.writes.map((entry) => writePage(entry.slug, entry.content)) ?? [];

                void Promise.all([persistMain, ...persistYears])
                  .then(() => {
                    setMetadata(savedMetadata);
                    const savedTitle = savedMetadata.title.trim();
                    if (savedTitle) {
                      setPages((current) =>
                        current.map((page) =>
                          page.slug === selectedSlug ? { ...page, title: savedTitle } : page,
                        ),
                      );
                    }
                    setEntityStale(false);
                  entityServerBaselineRef.current.set(selectedSlug, savedContent);
                    pendingCloudSaveAtRef.current = savedAt;
                    ownRebuildBaselineLastOkAtRef.current = rebuildStatus?.lastOkAt ?? null;
                    sawOwnRebuildRunningRef.current = false;
                    setDraftSlugs((current) => {
                      const next = new Set(current);
                      next.delete(selectedSlug);
                      return next;
                    });
                    setAllSources(syncPlan?.sources ?? sourcesForSync);
                    if (syncPlan && syncPlan.writes.length > 0) {
                      void listPages().then(setPages);
                    }
                    setAwaitingOwnRebuild(true);
                    triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/cms/");
                    setSavingPage(false);
                  })
                  .catch((error: unknown) => {
                    setSavingPage(false);
                    const message = error instanceof Error ? error.message : String(error);
                    setLoadError(message);
                  });
              }}
            >
              <SvgAssetIcon svg={saveSvg} className="cms__button-icon" focusable={false} />
            </button>
            </>
          )}
        </div>
      </header>

      {loadError ? (
        <p className="cms__error" role="alert">
          {loadError}
          {loadError.includes("404") ? (
            <>
              {" "}
              Revisá las políticas de Supabase Storage e iniciá sesión con una cuenta autorizada.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="cms__editor-panel">
        <PageMetadataForm
          metadata={metadata}
          pageSlug={selectedSlug}
          documentReady={Boolean(selectedSlug) && loadedSlug === selectedSlug}
          expectedKind={expectedKind}
          catalogReady={catalogReady}
          conceptTitles={conceptTitles}
          conceptPages={conceptPages}
          pageLinks={pageLinks}
          courseTitles={courseTitles}
          coursePages={coursePages}
          degreeTitles={degreeTitles}
          degreeDisplayByTitle={degreeDisplayByTitle}
          body={body}
          resources={resources}
          onChange={setMetadata}
          onBodyChange={setBody}
        />
      </section>

      <section className="cms__diagnostics" aria-busy={diagnosticsPending}>
        <header className="cms__diagnostics-head">
          <h2 className="cms__diagnostics-title">Diagnósticos</h2>
          <p className="cms__diagnostics-lead">
            Los errores en esta página impiden guardar; las advertencias se muestran pero no bloquean el
            guardado.
          </p>
        </header>
        <div className="cms__diagnostics-wrap">
          <table className="cms__diagnostics-table">
            <colgroup>
              <col className="cms__diagnostics-col cms__diagnostics-col--severity" />
              <col className="cms__diagnostics-col cms__diagnostics-col--code" />
              <col className="cms__diagnostics-col cms__diagnostics-col--message" />
            </colgroup>
            <thead>
              <tr>
                <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Gravedad</th>
                <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Código</th>
                <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {diagnosticsPending ? (
                <tr className="cms__diagnostics-row cms__diagnostics-row--placeholder" aria-hidden="true">
                  <td className="cms__diagnostics-cell cms__diagnostics-empty cms__diagnostics-empty--reserved">
                    &nbsp;
                  </td>
                  <td className="cms__diagnostics-cell cms__diagnostics-empty cms__diagnostics-empty--reserved">
                    &nbsp;
                  </td>
                  <td className="cms__diagnostics-cell cms__diagnostics-empty cms__diagnostics-empty--reserved">
                    &nbsp;
                  </td>
                </tr>
              ) : pageDiagnostics.length === 0 ? (
                <tr className="cms__diagnostics-row">
                  <td className="cms__diagnostics-cell cms__diagnostics-empty" colSpan={3}>
                    No hay diagnósticos en esta página.
                  </td>
                </tr>
              ) : (
                pageDiagnostics.map((diagnostic, index) => (
                  <tr
                    key={`${diagnostic.code}-${diagnostic.page}-${index}`}
                    className="cms__diagnostics-row"
                  >
                    <td className={`cms__diagnostics-cell ${severityClass(diagnostic.severity)}`}>
                      {diagnostic.severity}
                    </td>
                    <td className="cms__diagnostics-cell">{diagnostic.code}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      </div>
      </div>
    </>
  );
}
