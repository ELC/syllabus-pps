import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  isReadOnlyCms,
  listPages,
  loadAllPageSources,
  loadResources,
  readPage,
  writePage,
} from "./api/content";
import type { ResourceCatalogEntry } from "@pps/core";
import { readPageParam, writePageParam } from "./page-param";
import { hasBlockingDiagnostics, runDiagnosticsForEditor } from "./validation/runDiagnostics";

function severityClass(severity: string): string {
  if (severity === "error") {
    return "cms__diagnostics-severity--error";
  }
  if (severity === "warning") {
    return "cms__diagnostics-severity--warning";
  }
  return "";
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

  const readOnly = isReadOnlyCms();
  const canSave = !readOnly && !hasBlockingDiagnostics(diagnostics);

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
          {page.slug}
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
          rows={24}
          spellCheck={false}
        />
      </section>

      <section className="cms__diagnostics">
        <header className="cms__diagnostics-head">
          <h2 className="cms__diagnostics-title">Diagnostics</h2>
          <p className="cms__diagnostics-lead">Errors and warnings block save until resolved.</p>
        </header>
        <div className="cms__diagnostics-wrap">
          {diagnostics.length === 0 ? (
            <p className="cms__diagnostics-empty">No diagnostics.</p>
          ) : (
            <table className="cms__diagnostics-table">
              <thead>
                <tr>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Severity</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Code</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Page</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Line</th>
                  <th className="cms__diagnostics-cell cms__diagnostics-cell--head">Message</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((diagnostic, index) => (
                  <tr
                    key={`${diagnostic.code}-${diagnostic.page}-${diagnostic.line}-${index}`}
                    className="cms__diagnostics-row"
                  >
                    <td className={`cms__diagnostics-cell ${severityClass(diagnostic.severity)}`}>
                      {diagnostic.severity}
                    </td>
                    <td className="cms__diagnostics-cell">{diagnostic.code}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.page ?? ""}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.line ?? ""}</td>
                    <td className="cms__diagnostics-cell">{diagnostic.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {readOnly ? (
        <p className="cms__hint">Saving is disabled on the hosted site.</p>
      ) : (
        <div className="cms__actions">
          <button
            type="button"
            className="cms__button"
            disabled={!canSave}
            onClick={() => {
              void writePage(selectedSlug, content).then(() => {
                setStatus("Saved.");
                return loadAllPageSources().then(setAllSources);
              });
            }}
          >
            Save
          </button>
          {status ? <span className="cms__status">{status}</span> : null}
          {!canSave ? <p className="cms__hint">Fix errors and warnings before saving.</p> : null}
        </div>
      )}
      </div>
      </div>
    </>
  );
}
