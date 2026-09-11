import { useEffect, useMemo, useState } from "react";
import { listPages, loadAllPageSources, readPage, writePage } from "./api/content";
import { readPageParam, writePageParam } from "./page-param";
import { SiteShell } from "@pps/shell/SiteShell";
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
  const [allSources, setAllSources] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    void listPages().then((items) => {
      setPages(items);
      const requested = readPageParam();
      const match = requested ? items.find((item) => item.slug === requested) : undefined;
      setSelectedSlug(match?.slug ?? items[0]?.slug ?? "");
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

  const canSave = !hasBlockingDiagnostics(diagnostics);

  const pageNav = (
    <nav className="dashboard-nav dashboard-nav-sub" aria-label="Pages">
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

  return (
    <SiteShell activeNav="cms" sidebarExtra={pageNav}>
      <header className="dashboard-header">
        <h1>{selectedSlug || "CMS"}</h1>
        <p>Local dev mode: edits write to content/pages via the Vite API middleware.</p>
      </header>

      <section className="cms-editor-panel">
        <textarea
          className="cms-editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
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
    </SiteShell>
  );
}
