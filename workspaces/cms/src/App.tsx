import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { triggerAnalyticsRebuild } from "@pps/content/browser";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import plusSvg from "@pps/shell/assets/icons/ui-plus.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import warningSvg from "@pps/shell/assets/icons/ui-warning.svg?raw";
import { listPages, loadAllPageSources, loadResources, readPage, writePage } from "./api/content";
import {
  createSeverityClassNameResolver,
  hasBlockingDiagnostics,
  type PageSource,
  type ResourceCatalogEntry,
} from "@pps/core";
import { normalizeYearCourseSlugs, type CoursePageOption } from "./course-pages";
import { PageMetadataForm } from "./components/PageMetadataForm";
import { SidebarNavSkeleton } from "./components/SidebarNavSkeleton";
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

const severityClass = createSeverityClassNameResolver("cms__diagnostics-severity");

function mergeDraftSources(local: PageSource[], remote: PageSource[]): PageSource[] {
  const remoteSlugs = new Set(remote.map((page) => page.path.replace(/\.md$/i, "")));
  const drafts = local.filter((page) => !remoteSlugs.has(page.path.replace(/\.md$/i, "")));
  return [...drafts, ...remote];
}

export function App() {
  const [pages, setPages] = useState<Array<{ slug: string; path: string }>>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [metadata, setMetadata] = useState<PageMetadata>(() => defaultPageMetadata(""));
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [allSources, setAllSources] = useState<Array<{ path: string; content: string }>>([]);
  const [resources, setResources] = useState<ResourceCatalogEntry[]>([]);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(() => new Set());
  const [loadedSlug, setLoadedSlug] = useState("");
  const [query, setQuery] = useState("");
  const rebuildStatus = useAnalyticsRebuildStatus();

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

  function loadDocumentFromSource(slug: string, source: string): void {
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
  }

  function selectPage(slug: string): void {
    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }
    if (!draftSlugs.has(slug)) {
      const cached = allSources.find((page) => page.path.replace(/\.md$/i, "") === slug);
      if (cached) {
        loadDocumentFromSource(slug, cached.content);
      } else {
        setLoadedSlug("");
      }
    }
    setSelectedSlug(slug);
  }

  useEffect(() => {
    if (!selectedSlug) {
      setLoadedSlug("");
      return;
    }

    let cancelled = false;

    if (draftSlugs.has(selectedSlug)) {
      const draft = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
      if (draft) {
        loadDocumentFromSource(selectedSlug, draft.content);
      }
      return;
    }

    const cached = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
    if (cached) {
      if (loadedSlug === selectedSlug) {
        const split = splitPageDocument(cached.content, selectedSlug);
        if (split.metadata.kind === "year") {
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
        }
        return;
      }
      loadDocumentFromSource(selectedSlug, cached.content);
      return () => {
        cancelled = true;
      };
    }

    setLoadedSlug("");
    void readPage(selectedSlug).then((source) => {
      if (cancelled) {
        return;
      }
      loadDocumentFromSource(selectedSlug, source);
    });

    return () => {
      cancelled = true;
    };
  }, [allSources, coursePages, draftSlugs, loadedSlug, selectedSlug]);

  useEffect(() => {
    void loadAllPageSources().then((sources) => {
      setAllSources((current) => mergeDraftSources(current, sources));
    });
    void loadResources().then(setResources);
  }, [pages]);

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
    for (const source of allSources) {
      const slug = source.path.replace(/\.md$/i, "");
      const { metadata: pageMeta } = splitPageDocument(source.content, slug);
      titles.set(slug, pageMeta.title ?? "");
    }
    return titles;
  }, [allSources]);

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
    loadingPages || (pages.length > 0 && allSources.length === 0 && !loadError);

  const catalogReady = pages.length === 0 || allSources.length > 0;
  const pageNavReady = !loadingPages && catalogReady;

  const canSave = !hasBlockingDiagnostics(pageDiagnostics);

  const expectedKind = useMemo(
    () => expectedEditorKind(selectedSlug, allSources),
    [allSources, selectedSlug],
  );

  function addNewPage(): void {
    const slug = nextDraftSlug(pages);
    const draftContent = createDraftPageContent(slug);
    const path = `${slug}.md`;

    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }

    setDraftSlugs((current) => new Set(current).add(slug));
    setPages((current) => [{ slug, path }, ...current]);
    setAllSources((current) => [{ path, content: draftContent }, ...current]);
    setSelectedSlug(slug);
    loadDocumentFromSource(slug, draftContent);
    setQuery("");
    setStatus("");
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
      <div className="dashboard__nav-scroll-body">
        {!pageNavReady ? (
          <SidebarNavSkeleton rows={pages.length} />
        ) : (
          filteredPages.map((page) => {
          const displayTitle = pageTitlesBySlug.get(page.slug)?.trim() || page.slug;
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
                className="cms__rebuild-indicator"
                loading={loadingPages}
              />
              {!canSave && selectedSlug && !diagnosticsPending ? (
                <span className="cms__save-blocked-hint" role="status">
                  Corregí los errores de esta página antes de guardar (las advertencias no bloquean).
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
          <>
            <button
              type="button"
              className="cms__button cms__button--secondary cms__button--icon"
              onClick={addNewPage}
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

                void Promise.all([persistMain, ...persistYears]).then(() => {
                  setMetadata(savedMetadata);
                  const yearNote =
                    syncPlan && syncPlan.writes.length > 0
                      ? ` (${syncPlan.writes.length} página(s) de año sincronizadas)`
                      : "";
                  setStatus(`Guardado ${selectedSlug}.${yearNote}`);
                  setDraftSlugs((current) => {
                    const next = new Set(current);
                    next.delete(selectedSlug);
                    return next;
                  });
                  setAllSources(syncPlan?.sources ?? sourcesForSync);
                  if (syncPlan && syncPlan.writes.length > 0) {
                    void listPages().then(setPages);
                  }
                  triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/cms/");
                });
              }}
            >
              <SvgAssetIcon svg={saveSvg} className="cms__button-icon" focusable={false} />
            </button>
            {status ? <span className="cms__status">{status}</span> : null}
          </>
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
