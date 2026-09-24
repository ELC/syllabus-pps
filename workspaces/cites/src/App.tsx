import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import {
  collectResourceCatalogIssues,
  parseResourceCatalogEntries,
  serializeResourceCatalogJson,
  type ResourceCatalogEntry,
} from "@pps/core";
import {
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  shouldRecheckEntityAfterAnalyticsAdvance,
  triggerAnalyticsRebuild,
} from "@pps/content/browser";
import { AnalyticsRebuildIndicator } from "@pps/shell/AnalyticsRebuildIndicator";
import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import { useAnalyticsRebuildStatus } from "@pps/shell/use-analytics-rebuild-status";
import plusSvg from "@pps/shell/assets/icons/ui-plus.svg?raw";
import refreshSvg from "@pps/shell/assets/icons/ui-refresh.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import warningSvg from "@pps/shell/assets/icons/ui-warning.svg?raw";
import { loadResources, writeResources } from "./api/resources";
import {
  CITES_REBUILD_STATUS_POLL,
  citesSaveBlockMessage,
  resolveCitesHeaderIndicatorOverride,
  resolveCitesSaveBlockReason,
} from "./catalog-sync";
import { createDraftEntry, entryForForm, isPendingDraftResourceId } from "./draft";
import { ResourceForm } from "./ResourceForm";
import { SidebarNavSkeleton } from "@pps/shell/SidebarNavSkeleton";
import { readNewResourceRequest, readResourceParam, writeResourceParam } from "./resource-param";

function indexForId(entries: ResourceCatalogEntry[], id: string | null): number {
  if (!id) {
    return 0;
  }
  const match = entries.findIndex((entry) => entry.id === id);
  return match >= 0 ? match : 0;
}

function resourceSnapshot(entry: ResourceCatalogEntry): string {
  return serializeResourceCatalogJson([entryForForm(entry)]);
}

export function App() {
  const [entries, setEntries] = useState<ResourceCatalogEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [entityStale, setEntityStale] = useState(false);
  const [awaitingOwnRebuild, setAwaitingOwnRebuild] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [cloudSaveIndicatorAt, setCloudSaveIndicatorAt] = useState<string | null>(null);

  const rebuildStatus = useAnalyticsRebuildStatus(CITES_REBUILD_STATUS_POLL);
  const rebuildStatusRef = useRef(rebuildStatus);
  const acknowledgedLastOkAtRef = useRef<string | null>(null);
  const entityServerBaselineRef = useRef<string>("");
  const entityBaselineSyncedAtRef = useRef<string | null>(null);
  const awaitingOwnRebuildRef = useRef(false);
  const ownRebuildBaselineLastOkAtRef = useRef<string | null>(null);
  const sawOwnRebuildRunningRef = useRef(false);
  const pendingCloudSaveAtRef = useRef<string | null>(null);

  useEffect(() => {
    rebuildStatusRef.current = rebuildStatus;
  }, [rebuildStatus]);

  useEffect(() => {
    awaitingOwnRebuildRef.current = awaitingOwnRebuild;
  }, [awaitingOwnRebuild]);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    void loadResources()
      .then((items) => {
        let nextItems = items;
        let nextIndex = 0;
        let urlId: string | null = null;

        if (readNewResourceRequest()) {
          const draft = createDraftEntry(items);
          nextItems = [draft, ...items];
          nextIndex = 0;
          urlId = draft.id;
        } else {
          const paramId = readResourceParam();
          if (paramId) {
            const found = items.findIndex((entry) => entry.id === paramId);
            if (found >= 0) {
              nextIndex = found;
              urlId = paramId;
            } else if (isPendingDraftResourceId(paramId)) {
              const draft = createDraftEntry(items, paramId);
              nextItems = [draft, ...items];
              nextIndex = 0;
              urlId = paramId;
            } else {
              nextIndex = indexForId(items, paramId);
              urlId = items[nextIndex]?.id ?? null;
            }
          }
        }

        if (urlId) {
          writeResourceParam(urlId);
        }

        setEntries(nextItems);
        setSelectedIndex(nextIndex);
        if (nextItems.length === 0) {
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

  useEffect(() => {
    if (!selected?.id || loading || savingCatalog) {
      return;
    }

    const resourceId = selected.id;
    const localSnapshot = resourceSnapshot(selected);
    let cancelled = false;

    void loadResources().then((items) => {
      if (cancelled) {
        return;
      }
      const remote = items.find((entry) => entry.id === resourceId);
      if (!remote) {
        return;
      }
      const remoteSnapshot = resourceSnapshot(remote);
      entityServerBaselineRef.current = remoteSnapshot;
      entityBaselineSyncedAtRef.current = new Date().toISOString();
      if (isEntityContentStale(remoteSnapshot, localSnapshot)) {
        setEntityStale(true);
        setCloudSaveIndicatorAt(null);
      } else {
        setEntityStale(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, savingCatalog, selected?.id, selectedIndex]);

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

    if (!selected?.id || loading || savingCatalog) {
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

    const resourceId = selected.id;
    let cancelled = false;
    void loadResources().then((items) => {
      if (cancelled) {
        return;
      }
      const remote = items.find((entry) => entry.id === resourceId);
      const checkpoint = rebuildStatusRef.current?.lastOkAt ?? lastOkAt;
      if (!remote || !checkpoint) {
        if (checkpoint) {
          acknowledgedLastOkAtRef.current = checkpoint;
        }
        return;
      }
      const remoteSnapshot = resourceSnapshot(remote);
      if (isEntityContentStale(remoteSnapshot, entityServerBaselineRef.current)) {
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
  }, [awaitingOwnRebuild, loading, rebuildStatus, savingCatalog, selected?.id]);

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

  const hasUnsavedChanges = useMemo(() => {
    if (!selected || loading || entityStale) {
      return false;
    }
    const baseline = entityServerBaselineRef.current;
    if (!baseline) {
      return false;
    }
    return resourceSnapshot(selected) !== baseline;
  }, [entityStale, loading, selected, entries, selectedIndex, savingCatalog]);

  function discardResourceChanges(): void {
    if (!selected || !hasUnsavedChanges) {
      return;
    }
    const baseline = entityServerBaselineRef.current;
    if (!baseline) {
      return;
    }
    const restored = parseResourceCatalogEntries(baseline)[0];
    if (!restored) {
      return;
    }
    setEntries((current) =>
      current.map((entry, index) =>
        index === selectedIndex ? { ...restored, id: entry.id } : entry,
      ),
    );
  }

  const saveBlockReason = resolveCitesSaveBlockReason({
    entityStale,
    catalogLoading: loading,
    rebuildStatus,
    awaitingOwnRebuild,
    hasCatalogIssues: catalogIssues.length > 0,
  });

  const canSave = saveBlockReason === null && !savingCatalog && !loadError;
  const saveBlockMessage = citesSaveBlockMessage(saveBlockReason);
  const showSaveBlockHint =
    saveBlockReason === "diagnostics" && Boolean(saveBlockMessage) && !loading;

  const headerIndicatorOverride = resolveCitesHeaderIndicatorOverride({
    entityStale,
    savingPage: savingCatalog,
    cloudSaveIndicatorAt,
    entityBaselineSyncedAt: entityBaselineSyncedAtRef.current,
    saveBlockReason,
    awaitingOwnRebuild,
    rebuildStatus,
    hasUnsavedChanges,
  });
  const workspaceLocked =
    entityStale ||
    loading ||
    isEditorWorkspaceActionsLocked({
      rebuildStatus,
      awaitingOwnRebuild,
      savingEntity: savingCatalog,
    });

  function addNewResource(): void {
    if (workspaceLocked) {
      return;
    }
    setEntries((current) => {
      const draft = createDraftEntry(current);
      return [draft, ...current];
    });
    setSelectedIndex(0);
    setQuery("");
    setLoadError("");
  }

  function patchSelected(patch: Partial<ResourceCatalogEntry>): void {
    setEntries((current) =>
      current.map((entry, index) => (index === selectedIndex ? { ...entry, ...patch } : entry)),
    );
  }

  const resourceNav = (
    <nav className="dashboard__nav dashboard__nav--sub" aria-label="Recursos" aria-busy={loading}>
      <div className="dashboard__nav-subhead">
        <div className="dashboard__nav-label">Recursos</div>
        <label className="cites__search">
          <span className="dashboard__nav-field-label">Filtrar</span>
          <input
            className="cites__search-input"
            type="search"
            value={query}
            placeholder="id, título o URL"
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading}
          />
        </label>
      </div>
      <div
        className={
          loading
            ? "dashboard__nav-scroll-body dashboard__nav-scroll-body--loading"
            : "dashboard__nav-scroll-body"
        }
      >
        {loading ? (
          <SidebarNavSkeleton />
        ) : (
          filteredIndexes.map((index) => {
          const entry = entries[index];
          if (!entry) {
            return null;
          }
          const displayTitle = entry.title.trim() || entry.id || "(sin título)";
          return (
            <button
              key={`${entry.id}-${index}`}
              type="button"
              className={
                index === selectedIndex ? "dashboard__link dashboard__link--active" : "dashboard__link"
              }
              onClick={() => setSelectedIndex(index)}
              title={entry.id && displayTitle !== entry.id ? entry.id : undefined}
            >
              <span className="cites__page-link-label">{displayTitle}</span>
              {entryIssueIds.has(entry.id) ? (
                <span className="cites__page-warning" title="Tiene problemas en el catálogo" aria-label="Tiene problemas en el catálogo">
                  <SvgAssetIcon svg={warningSvg} className="cites__page-warning-icon" focusable={false} />
                </span>
              ) : null}
            </button>
          );
          })
        )}
      </div>
    </nav>
  );

  const sidebarExtra = document.getElementById("cites-sidebar-extra");

  return (
    <>
      {sidebarExtra ? createPortal(resourceNav, sidebarExtra) : resourceNav}

      <div className="dashboard__content">
        <div className="cites__workspace">
          <header className="cites__header">
            <div className="dashboard__header-top cites__header-top">
              <div className="dashboard__header-title-band">
                <div className="cites__header-title-row dashboard__header-title-row">
                  <h1 className="cites__header-title dashboard__header-title">Catálogo de recursos</h1>
                  <div className="cites__header-status-cluster">
                    <AnalyticsRebuildIndicator
                      status={rebuildStatus}
                      className={
                        entityStale
                          ? "cites__rebuild-indicator cites__rebuild-indicator--stale"
                          : "cites__rebuild-indicator"
                      }
                      loading={loading && !headerIndicatorOverride}
                      override={headerIndicatorOverride}
                      role={entityStale ? "alert" : "status"}
                    />
                    {showSaveBlockHint ? (
                      <span className="cites__save-blocked-hint" role="status">
                        {saveBlockMessage}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="cites__header-actions dashboard__header-actions">
              {entityStale ? (
                <button
                  type="button"
                  className="cites__button cites__button--save cites__button--refresh"
                  onClick={() => window.location.reload()}
                  title="Recargar la página"
                  aria-label="Recargar la página para obtener el catálogo actualizado"
                >
                  <SvgAssetIcon svg={refreshSvg} className="cites__button-icon" focusable={false} />
                  Recargar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="cites__button cites__button--secondary cites__button--icon"
                    onClick={addNewResource}
                    disabled={workspaceLocked}
                    title="New resource"
                    aria-label="New resource"
                  >
                    <SvgAssetIcon svg={plusSvg} className="cites__button-icon" focusable={false} />
                  </button>
                  <button
                    type="button"
                    className="cites__button cites__button--secondary cites__button--icon"
                    disabled={!hasUnsavedChanges || workspaceLocked}
                    title="Descartar cambios"
                    aria-label="Descartar cambios y volver al contenido del servidor"
                    onClick={discardResourceChanges}
                  >
                    <SvgAssetIcon svg={refreshSvg} className="cites__button-icon" focusable={false} />
                  </button>
                  <button
                    type="button"
                    className="cites__button cites__button--save cites__button--icon"
                    disabled={!canSave}
                    title="Save catalog"
                    aria-label="Save catalog"
                    onClick={() => {
                      setSavingCatalog(true);
                      setCloudSaveIndicatorAt(null);
                      const savedAt = new Date().toISOString();
                      void writeResources(entries)
                        .then(() => {
                          setEntityStale(false);
                          if (selected?.id) {
                            entityServerBaselineRef.current = resourceSnapshot(selected);
                            entityBaselineSyncedAtRef.current = savedAt;
                          }
                          pendingCloudSaveAtRef.current = savedAt;
                          ownRebuildBaselineLastOkAtRef.current = rebuildStatus?.lastOkAt ?? null;
                          sawOwnRebuildRunningRef.current = false;
                          setAwaitingOwnRebuild(true);
                          triggerAnalyticsRebuild(import.meta.env.BASE_URL ?? "/cites/");
                          setSavingCatalog(false);
                        })
                        .catch((error: unknown) => {
                          setSavingCatalog(false);
                          const message = error instanceof Error ? error.message : String(error);
                          setLoadError(message);
                        });
                    }}
                  >
                    <SvgAssetIcon svg={saveSvg} className="cites__button-icon" focusable={false} />
                  </button>
                </>
              )}
                </div>
              </div>
              <div className="dashboard__header-lead-row">
                <p className="dashboard__header-lead">
                  Catálogo de recursos en Supabase Postgres. Local sin login; sitio publicado con
                  autenticación.
                </p>
              </div>
            </div>
          </header>

          <div className="cites__body">
            {loadError ? (
              <p className="cites__error" role="alert">
                {loadError}
                {loadError.includes("404") ? (
                  <> Check Supabase RLS policies and sign in with an allowed account.</>
                ) : null}
              </p>
            ) : null}

            <div className="cites__form-panel">
              {formEntry && !loading ? (
                <ResourceForm entry={formEntry} onChange={patchSelected} />
              ) : (
                <div
                  className={`cites__form cites__form--placeholder${loading ? " cites__form--loading" : ""}`}
                  aria-busy={loading}
                  aria-live="polite"
                >
                  {loading ? (
                    <>
                      <span className="cites__sr-only">Cargando recurso…</span>
                      <div className="cites__form-skeleton" aria-hidden="true">
                        <div className="cites__form-skeleton-line cites__form-skeleton-line--title" />
                        <div className="cites__form-skeleton-line cites__form-skeleton-line--wide" />
                        <div className="cites__form-skeleton-line cites__form-skeleton-line--wide" />
                        <div className="cites__form-skeleton-line cites__form-skeleton-line--medium" />
                        <div className="cites__form-skeleton-line cites__form-skeleton-line--authors" />
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <section className="cites__diagnostics" aria-busy={loading}>
            <header className="cites__diagnostics-head">
              <h2 className="cites__diagnostics-title">Validation</h2>
              <p className="cites__diagnostics-lead">
                Catalog issues block save until resolved. Showing issues for this resource
                {selected ? ` (${selected.id || "no id"})` : ""}.
              </p>
            </header>
            <div className="cites__diagnostics-wrap">
              {loading ? (
                <p className="cites__diagnostics-empty cites__diagnostics-empty--reserved">&nbsp;</p>
              ) : selectedIssues.length === 0 ? (
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
      </div>
    </>
  );
}
