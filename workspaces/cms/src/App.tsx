import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import {
  isReadOnlyCms,
  listPages,
  loadAllPageSources,
  loadResources,
  readPage,
  writePage,
} from "./api/content";
import {
  createSeverityClassNameResolver,
  hasBlockingDiagnostics,
  type ResourceCatalogEntry,
} from "@pps/core";
import { readPageParam, writePageParam } from "./page-param";
import { filterDiagnosticsForPage, pageHasDiagnostics } from "./validation/filterDiagnostics";
import { runDiagnosticsForEditor } from "./validation/runDiagnostics";

const severityClass = createSeverityClassNameResolver("cms__diagnostics-severity");

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
          setLoadError("No pages found in content/pages.");
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

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }
    void readPage(selectedSlug).then(setContent);
  }, [selectedSlug]);

  useEffect(() => {
    void loadAllPageSources().then(setAllSources);
    void loadResources().then(setResources);
  }, [pages, content, selectedSlug]);

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

  const readOnly = isReadOnlyCms();
  const canSave = !readOnly && !hasBlockingDiagnostics(pageDiagnostics);

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
          onClick={() => setSelectedSlug(page.slug)}
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
          <h1 className="cms__header-title">{selectedSlug || "CMS"}</h1>
          <p className="cms__header-lead">
            {readOnly ? (
              <>
                Read-only snapshot from the last <code className="cms__code">pnpm build:pages</code>.
                Run <code className="cms__code">pnpm dev</code> to edit{" "}
                <code className="cms__code">content/pages</code> locally.
              </>
            ) : (
              <>
                Edits write to <code className="cms__code">content/pages</code> through the local dev
                API. Run <code className="cms__code">pnpm dev</code> and open{" "}
                <code className="cms__code">/cms/</code> on the host port, or{" "}
                <code className="cms__code">pnpm dev:cms</code> for CMS-only on port 5173.
              </>
            )}
          </p>
        </div>
        <div className="cms__header-actions">
          {readOnly ? (
            <p className="cms__hint">Saving is disabled on the hosted site.</p>
          ) : (
            <>
              <button
                type="button"
                className="cms__button cms__button--save"
                disabled={!canSave}
                onClick={() => {
                  void writePage(selectedSlug, content).then(() => {
                    setStatus(`Saved ${selectedSlug}.`);
                    setAllSources((sources) =>
                      sources.map((page) =>
                        page.path.replace(/\.md$/i, "") === selectedSlug
                          ? { ...page, content }
                          : page,
                      ),
                    );
                  });
                }}
              >
                Save page
              </button>
              {status ? <span className="cms__status">{status}</span> : null}
              {!canSave ? (
                <p className="cms__hint">Fix errors and warnings on this page before saving.</p>
              ) : null}
            </>
          )}
        </div>
      </header>

      {loadingPages ? <p className="cms__loading">Loading pages…</p> : null}
      {loadError ? (
        <p className="cms__error" role="alert">
          {loadError}
          {loadError.includes("404") && !readOnly ? (
            <>
              {" "}
              Start the CMS dev server with <code className="cms__code">pnpm dev</code> or{" "}
              <code className="cms__code">pnpm dev:cms</code>.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="cms__editor-panel">
        <textarea
          className="cms__editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          readOnly={readOnly}
          rows={14}
          spellCheck={false}
        />
      </section>

      <section className="cms__diagnostics">
        <header className="cms__diagnostics-head">
          <h2 className="cms__diagnostics-title">Diagnostics</h2>
          <p className="cms__diagnostics-lead">
            Errors and warnings on this page block save until resolved.
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
