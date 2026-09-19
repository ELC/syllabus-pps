import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { triggerAnalyticsRebuild } from "@pps/content/browser";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import { listPages, loadAllPageSources, loadResources, readPage, writePage } from "./api/content";
import {
  createSeverityClassNameResolver,
  hasBlockingDiagnostics,
  type PageSource,
  type ResourceCatalogEntry,
} from "@pps/core";
import { createDraftPageContent, nextDraftSlug } from "./draft-page";
import { readPageParam, writePageParam } from "./page-param";
import { filterDiagnosticsForPage, pageHasDiagnostics } from "./validation/filterDiagnostics";
import { runDiagnosticsForEditor } from "./validation/runDiagnostics";

const severityClass = createSeverityClassNameResolver("cms__diagnostics-severity");

function IconPlus(): ReactElement {
  return (
    <svg className="cms__button-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z" />
    </svg>
  );
}

function IconSave(): ReactElement {
  return (
    <svg className="cms__button-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"
      />
    </svg>
  );
}

function mergeDraftSources(local: PageSource[], remote: PageSource[]): PageSource[] {
  const remoteSlugs = new Set(remote.map((page) => page.path.replace(/\.md$/i, "")));
  const drafts = local.filter((page) => !remoteSlugs.has(page.path.replace(/\.md$/i, "")));
  return [...drafts, ...remote];
}

function PageDiagnosticWarning(): ReactElement {
  return (
    <svg
      className="cms__page-warning-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 2.25 2.25 19.5h19.5L12 2.25Zm0 4.2 6.45 11.05H5.55L12 6.45ZM11.1 10v3.6h1.8V10h-1.8Zm0 4.8v1.8h1.8v-1.8h-1.8Z"
      />
    </svg>
  );
}

export function App() {
  const [pages, setPages] = useState<Array<{ slug: string; path: string }>>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [loadingPages, setLoadingPages] = useState(true);
  const [allSources, setAllSources] = useState<Array<{ path: string; content: string }>>([]);
  const [resources, setResources] = useState<ResourceCatalogEntry[]>([]);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(() => new Set());
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
          setLoadError("No pages found in Supabase Storage.");
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

  function persistDraftContent(slug: string, draftContent: string): void {
    setAllSources((sources) =>
      sources.map((page) =>
        page.path.replace(/\.md$/i, "") === slug ? { ...page, content: draftContent } : page,
      ),
    );
  }

  function selectPage(slug: string): void {
    if (selectedSlug && draftSlugs.has(selectedSlug)) {
      persistDraftContent(selectedSlug, content);
    }
    setSelectedSlug(slug);
  }

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }
    if (draftSlugs.has(selectedSlug)) {
      const draft = allSources.find((page) => page.path.replace(/\.md$/i, "") === selectedSlug);
      if (draft) {
        setContent(draft.content);
      }
      return;
    }
    void readPage(selectedSlug).then(setContent);
  }, [allSources, draftSlugs, selectedSlug]);

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

  const canSave = !hasBlockingDiagnostics(pageDiagnostics);

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
    setContent(draftContent);
    setStatus("");
    setLoadError("");
  }

  const pageNav = (
    <nav className="dashboard__nav dashboard__nav--sub dashboard__nav--scroll" aria-label="Pages">
      <div className="dashboard__nav-label">Pages</div>
      {pages.map((page) => (
        <button
          key={page.slug}
          type="button"
          className={
            page.slug === selectedSlug ? "dashboard__link dashboard__link--active" : "dashboard__link"
          }
          onClick={() => selectPage(page.slug)}
        >
          <span className="cms__page-link-label">{page.slug}</span>
          {diagnosticPageSlugs.has(page.slug) ? (
            <span className="cms__page-warning" title="Has diagnostics" aria-label="Has diagnostics">
              <PageDiagnosticWarning />
            </span>
          ) : null}
        </button>
      ))}
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
            <h1 className="cms__header-title">{selectedSlug || "CMS"}</h1>
            <AnalyticsRebuildIndicator status={rebuildStatus} className="cms__rebuild-indicator" />
          </div>
          <p className="cms__header-lead">
            Edits save markdown pages to Supabase Storage. Local dev uses{" "}
            <code className="cms__code">pnpm dev</code> without sign-in; the hosted site requires auth.
          </p>
        </div>
        <div className="cms__header-actions">
          <>
            <button
              type="button"
              className="cms__button cms__button--secondary cms__button--icon"
              onClick={addNewPage}
              title="New page"
              aria-label="New page"
            >
              <IconPlus />
            </button>
            <button
              type="button"
              className="cms__button cms__button--save cms__button--icon"
              disabled={!canSave || !selectedSlug}
              title="Save page"
              aria-label="Save page"
              onClick={() => {
                void writePage(selectedSlug, content).then(() => {
                  setStatus(`Saved ${selectedSlug}.`);
                  setDraftSlugs((current) => {
                    const next = new Set(current);
                    next.delete(selectedSlug);
                    return next;
                  });
                  setAllSources((sources) =>
                    sources.map((page) =>
                      page.path.replace(/\.md$/i, "") === selectedSlug ? { ...page, content } : page,
                    ),
                  );
                  triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/cms/");
                });
              }}
            >
              <IconSave />
            </button>
            {status ? <span className="cms__status">{status}</span> : null}
            {!canSave ? (
              <p className="cms__hint">Fix errors on this page before saving (warnings are allowed).</p>
            ) : null}
          </>
        </div>
      </header>

      {loadingPages ? <p className="cms__loading">Loading pages…</p> : null}
      {loadError ? (
        <p className="cms__error" role="alert">
          {loadError}
          {loadError.includes("404") ? (
            <>
              {" "}
              Check Supabase Storage policies and sign in with an allowed account.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="cms__editor-panel">
        <textarea
          className="cms__editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          readOnly={false}
          rows={14}
          spellCheck={false}
        />
      </section>

      <section className="cms__diagnostics">
        <header className="cms__diagnostics-head">
          <h2 className="cms__diagnostics-title">Diagnostics</h2>
          <p className="cms__diagnostics-lead">
            Errors on this page block save; warnings are shown but do not block save.
          </p>
        </header>
        <div className="cms__diagnostics-wrap">
          {pageDiagnostics.length === 0 ? (
            <p className="cms__diagnostics-empty">No diagnostics on this page.</p>
          ) : (
            <table className="cms__diagnostics-table">
              <thead>
                <tr>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Severity</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Code</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Line</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Message</th>
                </tr>
              </thead>
              <tbody>
                {pageDiagnostics.map((diagnostic, index) => (
                  <tr
                    key={`${diagnostic.code}-${diagnostic.page}-${diagnostic.line}-${index}`}
                    className="cms__diagnostics-row"
                  >
                    <td className={`cms__diagnostics-cell ${severityClass(diagnostic.severity)}`}>
                      {diagnostic.severity}
                    </td>
                    <td className="cms__diagnostics-cell">{diagnostic.code}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.line ?? ""}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      </div>
      </div>
    </>
  );
}
