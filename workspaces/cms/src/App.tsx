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
  PageKind,
  parseYearSlug,
  type PageSource,
  type ResourceCatalogEntry,
} from "@pps/core";
import { type CoursePageOption } from "./course-pages";
import { normalizeYearCourseLists } from "./page-document";
import { PageMetadataForm } from "./components/PageMetadataForm";
import { SidebarNavSkeleton } from "@pps/shell/SidebarNavSkeleton";
import { createDraftPageContent, nextDraftSlug } from "./draft-page";
import {
  canonicalEditorPageContent,
  composePageDocument,
  defaultPageMetadata,
  splitPageDocument,
  type EditorPageKind,
  type PageMetadata,
} from "./page-document";
import { readPageParam, writePageParam } from "./page-param";
import { filterDiagnosticsForPage, pageHasDiagnostics } from "./validation/filterDiagnostics";
import { planDegreeYearSync } from "./degree-year-sync";
import {
  degreeSlugForCourseInSources,
  degreeSlugForYearPage,
  roadmapCourseSubgraphHref,
} from "./roadmap-course-link";
import {
  networkCourseExpansionHref,
  networkDegreeExpansionHref,
  networkExpandHref,
  planningCoursePageHref,
  roadmapDegreeOverviewHref,
} from "@pps/shell/workspace-links";
import { WorkspaceNavLink } from "@pps/shell/WorkspaceNavLink";
import { siteRootFromEnv } from "@pps/shell/site-root";
import { preferDegreeDisplayName } from "./degree-display";
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
  const [selectedSlug, setSelectedSlug] = useState<string>(() => readPageParam() ?? "");
  const [metadata, setMetadata] = useState<PageMetadata>(() => defaultPageMetadata(""));
  const [body, setBody] = useState("");
  const [savingPage, setSavingPage] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [allSources, setAllSources] = useState<Array<{ path: string; content: string }>>([]);
  const [resources, setResources] = useState<ResourceCatalogEntry[]>([]);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(() => new Set());
  const [loadedSlug, setLoadedSlug] = useState("");
  const [knownPageKindTick, setKnownPageKindTick] = useState(0);
  const [query, setQuery] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [entityStale, setEntityStale] = useState(false);
  const rebuildStatus = useAnalyticsRebuildStatus(CMS_REBUILD_STATUS_POLL);
  const sourcesFetchGenerationRef = useRef(0);
  const acknowledgedLastOkAtRef = useRef<string | null>(null);
  const entityServerBaselineRef = useRef<Map<string, string>>(new Map());
  const entityBaselineSyncedAtRef = useRef<Map<string, string>>(new Map());
  const pageKindCacheRef = useRef<Map<string, EditorPageKind>>(new Map());
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
        const resolvedSlug = match?.slug ?? items[0]?.slug ?? "";
        setSelectedSlug(resolvedSlug);
        if (resolvedSlug) {
          writePageParam(resolvedSlug, "replace");
        }
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
    const onPopState = (): void => {
      const slug = readPageParam();
      if (slug) {
        setSelectedSlug(slug);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
      if (pageMeta.kind === PageKind.Concept) {
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
      if (pageMeta.kind === PageKind.Degree) {
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
      if (pageMeta.kind !== PageKind.Degree) {
        continue;
      }
      const display = preferDegreeDisplayName(pageMeta.title, pageMeta.fullName);
      map.set(pageMeta.title, display);
      const degreeSlug = pageMeta.slug.trim() || fileSlug;
      map.set(degreeSlug, display);
    }
    return map;
  }, [allSources]);

  const degreeSlugByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of allSources) {
      const fileSlug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, fileSlug);
      if (pageMeta.kind !== PageKind.Degree) {
        continue;
      }
      const degreeSlug = pageMeta.slug.trim() || fileSlug;
      map.set(pageMeta.title, degreeSlug);
      map.set(degreeSlug, degreeSlug);
    }
    return map;
  }, [allSources]);

  const coursePagesRef = useRef<CoursePageOption[]>([]);

  const coursePages = useMemo((): CoursePageOption[] => {
    const courses: CoursePageOption[] = [];
    for (const page of allSources) {
      const fileSlug = page.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(page.content, fileSlug);
      if (pageMeta.kind === PageKind.Course) {
        courses.push({
          slug: pageMeta.slug.trim() || fileSlug,
          title: pageMeta.title,
        });
      }
    }
    return courses.sort((left, right) => left.title.localeCompare(right.title, "es-AR"));
  }, [allSources]);

  coursePagesRef.current = coursePages;

  const courseTitles = useMemo(() => coursePages.map((course) => course.title), [coursePages]);

  function persistDraftContent(slug: string, draftContent: string): void {
    setAllSources((sources) =>
      sources.map((page) =>
        page.path.replace(/\.md$/i, "") === slug ? { ...page, content: draftContent } : page,
      ),
    );
  }

  function loadDocumentFromSource(slug: string, source: string, serverBaseline?: string): void {
    const courses = coursePagesRef.current;
    const split = splitPageDocument(source, slug);
    const metadata =
      split.metadata.kind === PageKind.Year
        ? {
            ...split.metadata,
            ...normalizeYearCourseLists(
              split.metadata.courses,
              split.metadata.coursesNoEstructurado,
              courses,
            ),
          }
        : split.metadata;
    setMetadata(metadata);
    setBody(split.body);
    setLoadedSlug(slug);
    entityServerBaselineRef.current.set(
      slug,
      serverBaseline ?? canonicalEditorPageContent(slug, source, courses),
    );
    entityBaselineSyncedAtRef.current.set(
      slug,
      metadata.updatedAt?.trim() || new Date().toISOString(),
    );
    pageKindCacheRef.current.set(slug, metadata.kind);
    setKnownPageKindTick((tick) => tick + 1);
  }

  function discardPageChanges(): void {
    if (!selectedSlug) {
      return;
    }
    const baseline = entityServerBaselineRef.current.get(selectedSlug);
    if (!baseline) {
      return;
    }
    loadDocumentFromSource(selectedSlug, baseline, baseline);
    setAllSources((sources) =>
      sources.map((page) =>
        page.path.replace(/\.md$/i, "") === selectedSlug ? { ...page, content: baseline } : page,
      ),
    );
  }

  function selectPage(slug: string): void {
    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }
    writePageParam(slug, "push");
    setSelectedSlug(slug);
  }

  const pageLoadSlugRef = useRef("");

  useEffect(() => {
    if (!selectedSlug) {
      pageLoadSlugRef.current = "";
      setLoadedSlug("");
      return;
    }

    const slugChanged = pageLoadSlugRef.current !== selectedSlug;
    pageLoadSlugRef.current = selectedSlug;

    if (draftSlugs.has(selectedSlug)) {
      const draft = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
      if (draft) {
        loadDocumentFromSource(selectedSlug, draft.content);
      }
      return;
    }

    let cancelled = false;
    const cachedContent = allSources.find(
      (page) => page.path.replace(/\.md$/i, "") === selectedSlug,
    )?.content;
    const courses = coursePagesRef.current;

    if (cachedContent !== undefined) {
      loadDocumentFromSource(selectedSlug, cachedContent);
    } else if (slugChanged) {
      setLoadedSlug("");
    }

    void readPage(selectedSlug).then((remote) => {
      if (cancelled || pageLoadSlugRef.current !== selectedSlug) {
        return;
      }
      const remoteCanonical = canonicalEditorPageContent(selectedSlug, remote, courses);
      const cachedCanonical =
        cachedContent !== undefined
          ? canonicalEditorPageContent(selectedSlug, cachedContent, courses)
          : undefined;
      if (cachedCanonical !== undefined && cachedCanonical !== remoteCanonical) {
        entityServerBaselineRef.current.set(selectedSlug, remoteCanonical);
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
  }, [draftSlugs, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug || draftSlugs.has(selectedSlug)) {
      return;
    }
    const cached = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
    if (!cached || loadedSlug !== selectedSlug) {
      return;
    }
    const split = splitPageDocument(cached.content, selectedSlug);
    if (split.metadata.kind !== PageKind.Year) {
      return;
    }
    setMetadata((current) => {
      if (current.kind !== PageKind.Year) {
        return current;
      }
      const normalized = normalizeYearCourseLists(
        split.metadata.courses,
        split.metadata.coursesNoEstructurado,
        coursePages,
      );
      if (
        normalized.courses.length === current.courses.length &&
        normalized.courses.every((slug, index) => slug === current.courses[index]) &&
        normalized.coursesNoEstructurado.length === current.coursesNoEstructurado.length &&
        normalized.coursesNoEstructurado.every(
          (slug, index) => slug === current.coursesNoEstructurado[index],
        )
      ) {
        return current;
      }
      return { ...current, ...normalized };
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
      const remoteCanonical = canonicalEditorPageContent(selectedSlug, remote, coursePages);
      if (isEntityContentStale(remoteCanonical, baseline)) {
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
    coursePages,
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

  const listedPageSlugs = useMemo(() => {
    const slugs = new Set(pages.map((page) => page.slug));
    for (const source of allSources) {
      slugs.add(source.path.replace(/\.md$/i, ""));
    }
    return slugs;
  }, [allSources, pages]);

  const diagnosticsPending =
    loadingPages ||
    sourcesLoading ||
    (pages.length > 0 && allSources.length === 0 && !loadError);

  const catalogReady = useMemo(() => {
    if (pages.length === 0) {
      return true;
    }
    if (allSources.length > 0) {
      return true;
    }
    return loadedSlug === selectedSlug && Boolean(selectedSlug);
  }, [allSources.length, loadedSlug, pages.length, selectedSlug]);
  const pageNavReadyLive = useMemo(() => {
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

  const pageNavReadyLatchRef = useRef({ catalogKey: "", ready: false });
  if (pageNavReadyLatchRef.current.catalogKey !== pageListKey) {
    pageNavReadyLatchRef.current = { catalogKey: pageListKey, ready: false };
  }
  if (pageNavReadyLive) {
    pageNavReadyLatchRef.current.ready = true;
  }
  const pageNavReady = pageNavReadyLatchRef.current.ready;

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedSlug || loadedSlug !== selectedSlug || entityStale) {
      return false;
    }
    const baseline = entityServerBaselineRef.current.get(selectedSlug);
    if (!baseline) {
      return false;
    }
    const currentCanonical = canonicalEditorPageContent(selectedSlug, content, coursePages);
    const baselineCanonical = canonicalEditorPageContent(selectedSlug, baseline, coursePages);
    return currentCanonical !== baselineCanonical;
  }, [content, coursePages, entityStale, loadedSlug, selectedSlug, savingPage]);

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
    entityBaselineSyncedAt: entityBaselineSyncedAtRef.current.get(selectedSlug) ?? null,
    saveBlockReason,
    awaitingOwnRebuild,
    rebuildStatus,
    hasUnsavedChanges,
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

  const layoutKind = useMemo((): EditorPageKind | null => {
    if (!selectedSlug) {
      return null;
    }
    if (expectedKind) {
      return expectedKind;
    }
    if (loadedSlug === selectedSlug) {
      const metaSlug = metadata.slug.trim() || selectedSlug;
      if (metaSlug === selectedSlug) {
        return metadata.kind;
      }
    }
    return pageKindCacheRef.current.get(selectedSlug) ?? null;
  }, [
    expectedKind,
    knownPageKindTick,
    loadedSlug,
    metadata.kind,
    metadata.slug,
    selectedSlug,
  ]);

  const documentReadyLive = Boolean(selectedSlug) && loadedSlug === selectedSlug;
  const editorPanelReadyLatchRef = useRef({ slug: "", ready: false });
  if (editorPanelReadyLatchRef.current.slug !== selectedSlug) {
    editorPanelReadyLatchRef.current = { slug: selectedSlug, ready: false };
  }
  if (documentReadyLive) {
    editorPanelReadyLatchRef.current.ready = true;
  }
  const documentReady = editorPanelReadyLatchRef.current.ready;

  const siteRoot = useMemo(
    () => siteRootFromEnv(import.meta.env.BASE_URL ?? "/cms/"),
    [],
  );

  const pageWorkspaceLinks = useMemo(() => {
    if (!selectedSlug) {
      return null;
    }

    const pageSlug =
      loadedSlug === selectedSlug && metadata.slug.trim()
        ? metadata.slug.trim()
        : selectedSlug;

    const navKind = layoutKind ?? expectedKind;
    const isYearSlug = Boolean(parseYearSlug(pageSlug));
    const isCourse = navKind === PageKind.Course;
    const isConcept = navKind === PageKind.Concept;
    const isDegree = navKind === PageKind.Degree;
    const isYear =
      navKind === PageKind.Year ||
      (isYearSlug && !isCourse && !isConcept && !isDegree);
    const kindUnknown = navKind === null && !isYearSlug;

    if (isYear) {
      const degreeSlug = degreeSlugForYearPage(pageSlug, metadata, degreeSlugByTitle);
      const roadmapHref = degreeSlug ? roadmapDegreeOverviewHref(siteRoot, degreeSlug) : null;
      const networkHref = degreeSlug ? networkExpandHref(siteRoot, pageSlug, degreeSlug) : null;
      const pendingMeta = navKind === null;

      return (
        <div className="cms__course-workspace-links pps-workspace-nav-links">
          <WorkspaceNavLink
            navId="planning"
            disabled
            title="El programa de cursada está en la página de la materia"
          >
            Programa
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="roadmap"
            href={roadmapHref}
            disabled={!roadmapHref}
            title={
              pendingMeta
                ? "Cargando metadatos de la página…"
                : roadmapHref
                  ? "Abrir la grilla de la carrera en Roadmap"
                  : "No se pudo resolver la carrera de este año"
            }
          >
            Roadmap
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="network"
            href={networkHref}
            disabled={!networkHref}
            title={
              pendingMeta
                ? "Cargando metadatos de la página…"
                : networkHref
                  ? undefined
                  : "No se pudo resolver la carrera de este año"
            }
          >
            Red
          </WorkspaceNavLink>
        </div>
      );
    }

    if (isCourse || isConcept || kindUnknown) {
      const degreeSlug = degreeSlugForCourseInSources(
        allSources,
        pageSlug,
        coursePages,
        metadata.title,
      );
      const planningHref = planningCoursePageHref(siteRoot, pageSlug, degreeSlug);
      const roadmapHref = degreeSlug
        ? roadmapCourseSubgraphHref(siteRoot, degreeSlug, pageSlug)
        : null;
      const courseNetworkHref = networkCourseExpansionHref(siteRoot, pageSlug);
      const conceptNetworkHref = networkCourseExpansionHref(siteRoot, pageSlug);
      const networkEnabled = isCourse || isConcept;
      const networkHref = isCourse
        ? courseNetworkHref
        : isConcept
          ? conceptNetworkHref
          : null;

      const programTitle = isConcept
        ? "El programa de cursada está en la página de la materia"
        : kindUnknown
          ? "Cargando metadatos de la página…"
          : undefined;
      const roadmapTitle = isConcept
        ? "El mapa de conceptos de una materia se abre desde su página de materia"
        : kindUnknown
          ? "Cargando metadatos de la página…"
          : roadmapHref
            ? undefined
            : "Asigná esta materia a un año en la grilla de la carrera para abrir el mapa";
      const networkTitle = kindUnknown ? "Cargando metadatos de la página…" : undefined;

      return (
        <div className="cms__course-workspace-links pps-workspace-nav-links">
          <WorkspaceNavLink
            navId="planning"
            href={isCourse ? planningHref : null}
            disabled={!isCourse}
            title={programTitle}
          >
            Programa
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="roadmap"
            href={isCourse ? roadmapHref : null}
            disabled={!isCourse || !roadmapHref}
            title={roadmapTitle}
          >
            Roadmap
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="network"
            href={networkHref}
            disabled={!networkEnabled}
            title={networkTitle}
          >
            Red
          </WorkspaceNavLink>
        </div>
      );
    }

    if (isDegree) {
      return (
        <div className="cms__course-workspace-links pps-workspace-nav-links">
          <WorkspaceNavLink
            navId="planning"
            disabled
            title="El programa de cursada está en la página de la materia"
          >
            Programa
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="roadmap"
            href={roadmapDegreeOverviewHref(siteRoot, pageSlug)}
            title="Abrir la grilla de años de la carrera en Roadmap"
          >
            Roadmap
          </WorkspaceNavLink>
          <WorkspaceNavLink
            navId="network"
            href={networkDegreeExpansionHref(siteRoot, pageSlug)}
          >
            Red
          </WorkspaceNavLink>
        </div>
      );
    }

    return (
      <div className="cms__course-workspace-links pps-workspace-nav-links">
        <WorkspaceNavLink navId="planning" disabled title="Sin enlaces de programa para este tipo de página">
          Programa
        </WorkspaceNavLink>
        <WorkspaceNavLink navId="roadmap" disabled title="Sin enlace de Roadmap para este tipo de página">
          Roadmap
        </WorkspaceNavLink>
        <WorkspaceNavLink navId="network" disabled title="Sin enlace de Red para este tipo de página">
          Red
        </WorkspaceNavLink>
      </div>
    );
  }, [
    allSources,
    coursePages,
    degreeSlugByTitle,
    expectedKind,
    layoutKind,
    loadedSlug,
    metadata.degree,
    metadata.slug,
    metadata.title,
    selectedSlug,
    siteRoot,
  ]);

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
    writePageParam(slug, "push");
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
      <header className="cms__header dashboard__header">
        <div className="dashboard__header-top cms__header-top">
          <div className="dashboard__header-title-band">
            <div className="cms__header-title-row dashboard__header-title-row">
              <h1 className="cms__header-title dashboard__header-title">Gestión de contenido</h1>
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
            <div className="cms__header-actions dashboard__header-actions">
          {entityStale ? (
            <>
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
            </>
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
              className="cms__button cms__button--secondary cms__button--icon"
              disabled={!hasUnsavedChanges || workspaceLocked || !selectedSlug}
              title="Descartar cambios"
              aria-label="Descartar cambios y volver al contenido del servidor"
              onClick={discardPageChanges}
            >
              <SvgAssetIcon svg={refreshSvg} className="cms__button-icon" focusable={false} />
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
                  ...(metadata.kind === PageKind.Year
                    ? normalizeYearCourseLists(
                        metadata.courses,
                        metadata.coursesNoEstructurado,
                        coursePages,
                      )
                    : {}),
                };
                const savedContent = composePageDocument(savedMetadata, body);

                const sourcesForSync = allSources.map((page) =>
                  page.path.replace(/\.md$/i, "") === selectedSlug
                    ? { ...page, content: savedContent }
                    : page,
                );
                const syncPlan =
                  savedMetadata.kind === PageKind.Degree
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
                    entityBaselineSyncedAtRef.current.set(selectedSlug, savedAt);
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
          </div>
          <div className="dashboard__header-lead-row">
            <p className="dashboard__header-lead">
              Páginas markdown en Supabase Storage. En local,{" "}
              <code className="cms__code">pnpm dev</code> no pide login; en producción, sí.
            </p>
            {pageWorkspaceLinks}
          </div>
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
          documentReady={documentReady}
          expectedKind={expectedKind}
          catalogReady={catalogReady}
          conceptTitles={conceptTitles}
          conceptPages={conceptPages}
          pageLinks={pageLinks}
          courseTitles={courseTitles}
          coursePages={coursePages}
          degreeTitles={degreeTitles}
          degreeDisplayByTitle={degreeDisplayByTitle}
          degreeSlugByTitle={degreeSlugByTitle}
          body={body}
          resources={resources}
          onChange={setMetadata}
          onBodyChange={setBody}
          listedPageSlugs={listedPageSlugs}
          pageTitlesBySlug={pageTitlesBySlug}
          onOpenPage={selectPage}
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
