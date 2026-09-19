import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";

import {
  collectResourceCatalogIssues,
  cslItemTypes,
  type CslItemType,
  type ResourceCatalogEntry,
} from "@pps/core";
import { triggerAnalyticsRebuild } from "@pps/content/browser";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import { loadResources, writeResources } from "./api/resources";
import { createDraftEntry, entryForForm, TYPE_LABELS } from "./draft";
import { NameFields } from "./NameFields";
import { readResourceParam, writeResourceParam } from "./resource-param";

function IconPlus(): ReactElement {
  return (
    <svg className="cites__button-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z"
      />
    </svg>
  );
}

function IconSave(): ReactElement {
  return (
    <svg className="cites__button-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"
      />
    </svg>
  );
}

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
  const rebuildStatus = useAnalyticsRebuildStatus();

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    void loadResources()
      .then((items) => {
        setEntries(items);
        setSelectedIndex(indexForId(items, readResourceParam()));
        if (items.length === 0) {
          setLoadError("No resources found in Supabase.");
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

  const canSave = !loading && !loadError && catalogIssues.length === 0;

  function addNewResource(): void {
    setEntries((current) => {
      const draft = createDraftEntry(current);
      return [draft, ...current];
    });
    setSelectedIndex(0);
    setQuery("");
    setStatus("");
    setLoadError("");
  }

  function patchSelected(patch: Partial<ResourceCatalogEntry>): void {
    setEntries((current) =>
      current.map((entry, index) => (index === selectedIndex ? { ...entry, ...patch } : entry)),
    );
  }

  const resourceNav = (
    <nav className="dashboard__nav dashboard__nav--sub dashboard__nav--scroll" aria-label="Resources">
      <div className="dashboard__nav-label">Resources</div>
      <label className="cites__search">
        <span className="dashboard__nav-field-label">Filter</span>
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
              <div className="cites__header-title-row">
                <h1 className="cites__header-title">{selected?.id || "Cites"}</h1>
                <AnalyticsRebuildIndicator status={rebuildStatus} className="cites__rebuild-indicator" />
              </div>
              <p className="cites__header-lead">
                Edits save the resource catalog to Supabase Postgres. Local dev uses{" "}
                <code className="cites__code">pnpm dev</code> without sign-in; the hosted site requires auth.
              </p>
            </div>
            <div className="cites__header-actions">
              <>
                <button
                  type="button"
                  className="cites__button cites__button--secondary cites__button--icon"
                  onClick={addNewResource}
                  title="New resource"
                  aria-label="New resource"
                >
                  <IconPlus />
                </button>
                <button
                  type="button"
                  className="cites__button cites__button--save cites__button--icon"
                  disabled={!canSave}
                  title="Save catalog"
                  aria-label="Save catalog"
                  onClick={() => {
                    void writeResources(entries).then(() => {
                      setStatus(`Saved ${entries.length} resources.`);
                      triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/cites/");
                    });
                  }}
                >
                  <IconSave />
                </button>
                {status ? <span className="cites__status">{status}</span> : null}
                {!canSave ? (
                  <p className="cites__hint">Fix catalog validation issues before saving.</p>
                ) : null}
              </>
            </div>
          </header>

          {loading ? <p className="cites__loading">Loading resources…</p> : null}
          {loadError ? (
            <p className="cites__error" role="alert">
              {loadError}
              {loadError.includes("404") ? (
                <> Check Supabase RLS policies and sign in with an allowed account.</>
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
                  readOnly={false}
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
                  disabled={false}
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
                  readOnly={false}
                  onChange={(event) => patchSelected({ title: event.target.value })}
                />
              </label>
              <label className="cites__field cites__field--full">
                <span className="cites__label">URL</span>
                <input
                  className="cites__input"
                  value={formEntry.URL ?? ""}
                  readOnly={false}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ URL: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Publisher</span>
                <input
                  className="cites__input"
                  value={formEntry.publisher ?? ""}
                  readOnly={false}
                  onChange={(event) => patchSelected({ publisher: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Container title</span>
                <input
                  className="cites__input"
                  value={formEntry["container-title"] ?? ""}
                  readOnly={false}
                  onChange={(event) => patchSelected({ "container-title": event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Issued (raw date)</span>
                <input
                  className="cites__input"
                  value={formEntry.issued?.raw ?? ""}
                  readOnly={false}
                  placeholder="2024 or 2024-03-15"
                  onChange={(event) => patchSelected({ issued: { raw: event.target.value } })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Accessed (raw date)</span>
                <input
                  className="cites__input"
                  value={formEntry.accessed?.raw ?? ""}
                  readOnly={false}
                  placeholder="2026-09-15"
                  onChange={(event) => patchSelected({ accessed: { raw: event.target.value } })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">DOI</span>
                <input
                  className="cites__input"
                  value={formEntry.DOI ?? ""}
                  readOnly={false}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ DOI: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">ISBN</span>
                <input
                  className="cites__input"
                  value={formEntry.ISBN ?? ""}
                  readOnly={false}
                  spellCheck={false}
                  onChange={(event) => patchSelected({ ISBN: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Edition</span>
                <input
                  className="cites__input"
                  value={formEntry.edition === undefined ? "" : String(formEntry.edition)}
                  readOnly={false}
                  onChange={(event) => patchSelected({ edition: event.target.value })}
                />
              </label>
              <label className="cites__field">
                <span className="cites__label">Genre</span>
                <input
                  className="cites__input"
                  value={formEntry.genre ?? ""}
                  readOnly={false}
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
                  readOnly={false}
                  onChange={(event) => patchSelected({ language: event.target.value })}
                />
              </label>

              <div className="cites__field cites__field--full">
                <NameFields
                  label="Authors"
                  names={formEntry.author ?? []}
                  readOnly={false}
                  onChange={(author) => patchSelected({ author })}
                />
              </div>
              <div className="cites__field cites__field--full">
                <NameFields
                  label="Editors"
                  names={formEntry.editor ?? []}
                  readOnly={false}
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
