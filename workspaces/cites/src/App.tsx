import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";

import {
  collectResourceCatalogIssues,
  cslItemTypes,
  type CslItemType,
  type ResourceCatalogEntry,
} from "@pps/core";
import { isReadOnlyCites, loadResources, writeResources } from "./api/resources";
import { createDraftEntry, entryForForm, TYPE_LABELS } from "./draft";
import { NameFields } from "./NameFields";
import { readResourceParam, writeResourceParam } from "./resource-param";

function PageDiagnosticWarning(): ReactElement {
  return (
    <svg
      className="cites__page-warning-icon"
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

function indexForId(entries: ResourceCatalogEntry[], id: string | null): number {
  if (!id) {
    return 0;
  }
  const match = entries.findIndex((entry) => entry.id === id);
  return match >= 0 ? match : 0;
}

export function App() {
  const [entries, setEntries] = useState<ResourceCatalogEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    void loadResources()
      .then((items) => {
        setEntries(items);
        setSelectedIndex(indexForId(items, readResourceParam()));
        if (items.length === 0) {
          setLoadError("No resources found in content/resources.json.");
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setEntries([]);
        setSelectedIndex(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const selected = entries[selectedIndex];
  const formEntry = selected ? entryForForm(selected) : undefined;

  useEffect(() => {
    if (!selected) {
      return;
    }
    writeResourceParam(selected.id);
  }, [selected]);

  const catalogIssues = useMemo(() => collectResourceCatalogIssues(entries), [entries]);

  const entryIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of catalogIssues) {
      if (issue.id) {
        ids.add(issue.id);
      }
    }
    return ids;
  }, [catalogIssues]);

  const selectedIssues = useMemo(() => {
    if (!selected) {
      return [];
    }
    return catalogIssues.filter((issue) => issue.id === selected.id || (!issue.id && !selected.id));
  }, [catalogIssues, selected]);

  const filteredIndexes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        if (!needle) {
          return true;
        }
        return (
          entry.id.toLowerCase().includes(needle) ||
          entry.title.toLowerCase().includes(needle) ||
          (entry.URL ?? "").toLowerCase().includes(needle)
        );
      })
      .map(({ index }) => index);
  }, [entries, query]);

  const readOnly = isReadOnlyCites();
  const canSave = !readOnly && !loading && !loadError && catalogIssues.length === 0;

  function patchSelected(patch: Partial<ResourceCatalogEntry>): void {
    setEntries((current) =>
      current.map((entry, index) => (index === selectedIndex ? { ...entry, ...patch } : entry)),
    );
  }

  const resourceNav = (
    <nav className="dashboard__nav dashboard__nav--sub dashboard__nav--scroll" aria-label="Resources">
      <div className="dashboard__nav-label">Resources</div>
      <label className="cites__search">
        <span className="cites__search-label">Filter</span>
        <input
          className="cites__search-input"
          type="search"
          value={query}
          placeholder="id, title, or URL"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {filteredIndexes.map((index) => {
        const entry = entries[index];
        if (!entry) {
          return null;
        }
        return (
          <button
            key={`${entry.id}-${index}`}
            type="button"
            className={
              index === selectedIndex ? "dashboard__link dashboard__link--active" : "dashboard__link"
            }
            onClick={() => setSelectedIndex(index)}
          >
            <span className="cites__page-link-label">{entry.id || "(no id)"}</span>
            {entryIssueIds.has(entry.id) ? (
              <span className="cites__page-warning" title="Has catalog issues" aria-label="Has catalog issues">
                <PageDiagnosticWarning />
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const sidebarExtra = document.getElementById("cites-sidebar-extra");

  return (
    <>
      {sidebarExtra ? createPortal(resourceNav, sidebarExtra) : resourceNav}

      <div className="dashboard__content">
        <div className="cites__workspace">
          <header className="cites__header">
            <div className="cites__header-main">
              <h1 className="cites__header-title">{selected?.id || "Cites"}</h1>
              <p className="cites__header-lead">
                {readOnly ? (
                  <>
                    Read-only snapshot from the last <code className="cites__code">pnpm build:pages</code>.
                    Run <code className="cites__code">pnpm dev</code> to edit{" "}
                    <code className="cites__code">content/resources.json</code> locally.
                  </>
                ) : (
                  <>
                    Edits write to <code className="cites__code">content/resources.json</code> through the
                    local dev API. Open <code className="cites__code">/cites/</code> on the host port.
                  </>
                )}
              </p>
            </div>
            <div className="cites__header-actions">
              {readOnly ? (
                <p className="cites__hint">Saving is disabled on the hosted site.</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="cites__button cites__button--secondary"
                    onClick={() => {
                      setEntries((current) => {
                        const draft = createDraftEntry(current);
                        return [draft, ...current];
                      });
                      setSelectedIndex(0);
                      setQuery("");
                      setStatus("");
                    }}
                  >
                    New resource
                  </button>
                  <button
                    type="button"
                    className="cites__button cites__button--ghost"
                    disabled={!selected}
                    onClick={() => {
                      if (!selected) {
                        return;
                      }
                      const confirmed = window.confirm(`Delete resource "${selected.id}"?`);
                      if (!confirmed) {
                        return;
                      }
                      setEntries((current) => current.filter((_, index) => index !== selectedIndex));
                      setSelectedIndex((index) => Math.max(0, index - 1));
                      setStatus(`Removed ${selected.id}.`);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="cites__button cites__button--save"
                    disabled={!canSave}
                    onClick={() => {
                      void writeResources(entries).then(() => {
                        setStatus(`Saved ${entries.length} resources.`);
                      });
                    }}
                  >
                    Save catalog
                  </button>
                  {status ? <span className="cites__status">{status}</span> : null}
                  {!canSave ? (
                    <p className="cites__hint">Fix catalog validation issues before saving.</p>
                  ) : null}
                </>
              )}
            </div>
          </header>

          {loading ? <p className="cites__loading">Loading resources…</p> : null}
          {loadError ? (
            <p className="cites__error" role="alert">
              {loadError}
              {loadError.includes("404") && !readOnly ? (
                <>
                  {" "}
                  Start the site with <code className="cites__code">pnpm dev</code>.
                </>
              ) : null}
            </p>
          ) : null}

          {formEntry ? (
            <form className="cites__form" onSubmit={(event) => event.preventDefault()}>
              <label className="cites__field">
                <span className="cites__label">Id</span>
                <input
                  className="cites__input"
                  value={formEntry.id}
                  readOnly={readOnly}
                  spellCheck={false}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    patchSelected({ id: event.target.value })
                  }
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Type</span>
                <select
                  className="cites__input"
                  value={formEntry.type}
                  disabled={readOnly}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    patchSelected({ type: event.target.value as CslItemType })
                  }
                >
                  {cslItemTypes.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cites__field cites__field--full">
                <span className="cites__label">Title</span>
                <input
                  className="cites__input"
                  value={formEntry.title}
                  readOnly={readOnly}
                  onChange={(event) => patchSelected({ title: event.target.value })}
                />
              </label>
              <label className="cites__field cites__field--full">
                <span className="cites__label">URL</span>
                <input
                  className="cites__input"
                  value={formEntry.URL ?? ""}
                  readOnly={readOnly}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ URL: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Publisher</span>
                <input
                  className="cites__input"
                  value={formEntry.publisher ?? ""}
                  readOnly={readOnly}
                  onChange={(event) => patchSelected({ publisher: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Container title</span>
                <input
                  className="cites__input"
                  value={formEntry["container-title"] ?? ""}
                  readOnly={readOnly}
                  onChange={(event) => patchSelected({ "container-title": event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Issued (raw date)</span>
                <input
                  className="cites__input"
                  value={formEntry.issued?.raw ?? ""}
                  readOnly={readOnly}
                  placeholder="2024 or 2024-03-15"
                  onChange={(event) => patchSelected({ issued: { raw: event.target.value } })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Accessed (raw date)</span>
                <input
                  className="cites__input"
                  value={formEntry.accessed?.raw ?? ""}
                  readOnly={readOnly}
                  placeholder="2026-09-15"
                  onChange={(event) => patchSelected({ accessed: { raw: event.target.value } })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">DOI</span>
                <input
                  className="cites__input"
                  value={formEntry.DOI ?? ""}
                  readOnly={readOnly}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ DOI: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">ISBN</span>
                <input
                  className="cites__input"
                  value={formEntry.ISBN ?? ""}
                  readOnly={readOnly}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ ISBN: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Edition</span>
                <input
                  className="cites__input"
                  value={formEntry.edition === undefined ? "" : String(formEntry.edition)}
                  readOnly={readOnly}
                  onChange={(event) => patchSelected({ edition: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Genre</span>
                <input
                  className="cites__input"
                  value={formEntry.genre ?? ""}
                  readOnly={readOnly}
                  list="cites-genre-options"
                  onChange={(event) => patchSelected({ genre: event.target.value })}
                />
                <datalist id="cites-genre-options">
                  <option value="interactive" />
                  <option value="course" />
                </datalist>
              </label>
              <label className="cites__field cites__field--full">
                <span className="cites__label">Language</span>
                <input
                  className="cites__input"
                  value={formEntry.language ?? ""}
                  readOnly={readOnly}
                  onChange={(event) => patchSelected({ language: event.target.value })}
                />
              </label>

              <div className="cites__field cites__field--full">
                <NameFields
                  label="Authors"
                  names={formEntry.author ?? []}
                  readOnly={readOnly}
                  onChange={(author) => patchSelected({ author })}
                />
              </div>
              <div className="cites__field cites__field--full">
                <NameFields
                  label="Editors"
                  names={formEntry.editor ?? []}
                  readOnly={readOnly}
                  onChange={(editor) => patchSelected({ editor })}
                />
              </div>
            </form>
          ) : null}

          <section className="cites__diagnostics">
            <header className="cites__diagnostics-head">
              <h2 className="cites__diagnostics-title">Validation</h2>
              <p className="cites__diagnostics-lead">
                Catalog issues block save until resolved. Showing issues for this resource
                {selected ? ` (${selected.id || "no id"})` : ""}.
              </p>
            </header>
            <div className="cites__diagnostics-wrap">
              {selectedIssues.length === 0 ? (
                <p className="cites__diagnostics-empty">
                  {catalogIssues.length === 0
                    ? "No catalog issues."
                    : "No issues on this resource. Other entries still block save."}
                </p>
              ) : (
                <table className="cites__diagnostics-table">
                  <thead>
                    <tr>
                      <th className="cites__diagnostics-cell cites__diagnostics-cell--head">Field</th>
                      <th className="cites__diagnostics-cell cites__diagnostics-cell--head">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIssues.map((issue, index) => (
                      <tr key={`${issue.id}-${issue.field}-${index}`} className="cites__diagnostics-row">
                        <td className="cites__diagnostics-cell cites__diagnostics-severity--error">
                          {issue.field}
                        </td>
                        <td className="cites__diagnostics-cell">{issue.message}</td>
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
