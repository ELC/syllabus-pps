import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { isReadOnlyCms, listPages, loadAllPageSources, readPage, writePage } from "./api/content";
import { readPageParam, writePageParam } from "./page-param";
import { hasBlockingDiagnostics, runDiagnosticsForEditor } from "./validation/runDiagnostics";

function severityClass(severity: string): string {
  if (severity === "error") {
    return "severity-error";
  }
  if (severity === "warning") {
    return "severity-warning";
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
  }, [pages, content, selectedSlug]);

  const diagnostics = useMemo(() => {
    if (!selectedSlug || allSources.length === 0) {
      return [];
    }
    return runDiagnosticsForEditor(selectedSlug, content, allSources);
  }, [allSources, content, selectedSlug]);

  const readOnly = isReadOnlyCms();
  const canSave = !readOnly && !hasBlockingDiagnostics(diagnostics);

  const pageNav = (
    <nav className="dashboard-nav dashboard-nav-sub dashboard-nav-sub--scroll" aria-label="Pages">
      <div className="dashboard-nav-label">Pages</div>
      {pages.map((page) => (
        <button
          key={page.slug}
          type="button"
          className={page.slug === selectedSlug ? "active" : undefined}
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

      <div className="cms-workspace">
      <header className="dashboard-header">
        <h1>{selectedSlug || "CMS"}</h1>
        <p>
          {readOnly ? (
            <>
              Read-only snapshot from the last <code>pnpm build:pages</code>. Run{" "}
              <code>pnpm dev</code> to edit <code>content/pages</code> locally.
            </>
          ) : (
            <>
              Edits write to <code>content/pages</code> through the local dev API. Run{" "}
              <code>pnpm dev</code> and open <code>/cms/</code> on the host port, or{" "}
              <code>pnpm dev:cms</code> for CMS-only on port 5173.
            </>
          )}
        </p>
      </header>

      {loadingPages ? <p className="cms-loading">Loading pages…</p> : null}
      {loadError ? (
        <p className="cms-error" role="alert">
          {loadError}
          {loadError.includes("404") && !readOnly ? (
            <>
              {" "}
              Start the CMS dev server with <code>pnpm dev</code> or <code>pnpm dev:cms</code>.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="cms-editor-panel">
        <textarea
          className="cms-editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          readOnly={readOnly}
          rows={24}
          spellCheck={false}
        />
      </section>

      <section className="dashboard-table-section">
        <header>
          <h2>Diagnostics</h2>
          <p>Errors and warnings block save until resolved.</p>
        </header>
        <div className="table-wrap">
          {diagnostics.length === 0 ? (
            <p className="dashboard-empty">No diagnostics.</p>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Code</th>
                  <th>Page</th>
                  <th>Line</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((diagnostic, index) => (
                  <tr key={`${diagnostic.code}-${diagnostic.page}-${diagnostic.line}-${index}`}>
                    <td className={severityClass(diagnostic.severity)}>{diagnostic.severity}</td>
                    <td>{diagnostic.code}</td>
                    <td>{diagnostic.page ?? ""}</td>
                    <td>{diagnostic.line ?? ""}</td>
                    <td>{diagnostic.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {readOnly ? (
        <p className="cms-hint">Saving is disabled on the hosted site.</p>
      ) : (
        <div className="cms-actions">
          <button
            type="button"
            className="cms-button"
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
          {status ? <span className="cms-status">{status}</span> : null}
          {!canSave ? <p className="cms-hint">Fix errors and warnings before saving.</p> : null}
        </div>
      )}
      </div>
    </>
  );
}
