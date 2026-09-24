import { describe, expect, it } from "vitest";

import {
  CMS_CATALOG_STALE_MESSAGE,
  CMS_HEADER_LOADING_CATALOG_LABEL,
  CMS_HEADER_SAVING_PAGE_LABEL,
  CMS_HEADER_UPDATING_ANALYTICS_LABEL,
  CMS_SAVE_SUCCESS_INDICATOR_LABEL,
  formatCmsCloudSaveIndicatorLabel,
  isCmsRebuildSaveBlocked,
  isCmsSidebarNavReady,
  isEditorWorkspaceActionsLocked,
  isEntityContentStale,
  isOwnAnalyticsRebuildComplete,
  resolveCmsHeaderIndicatorOverride,
  resolveCmsSaveBlockReason,
  shouldRecheckEntityAfterAnalyticsAdvance,
} from "../../../cms/src/catalog-sync";

describe("isEntityContentStale", () => {
  it("is false when remote matches baseline", () => {
    expect(isEntityContentStale("a", "a")).toBe(false);
  });

  it("is true when remote differs from baseline", () => {
    expect(isEntityContentStale("b", "a")).toBe(true);
  });
});

describe("shouldRecheckEntityAfterAnalyticsAdvance", () => {
  it("does not recheck while awaiting own rebuild", () => {
    expect(
      shouldRecheckEntityAfterAnalyticsAdvance({
        lastOkAt: "2026-01-02T00:00:00.000Z",
        acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
        awaitingOwnRebuild: true,
      }),
    ).toBe(false);
  });

  it("rechecks when lastOkAt advances after acknowledgement", () => {
    expect(
      shouldRecheckEntityAfterAnalyticsAdvance({
        lastOkAt: "2026-01-02T00:00:00.000Z",
        acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
        awaitingOwnRebuild: false,
      }),
    ).toBe(true);
  });

  it("does not recheck when lastOkAt unchanged", () => {
    expect(
      shouldRecheckEntityAfterAnalyticsAdvance({
        lastOkAt: "2026-01-01T00:00:00.000Z",
        acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
        awaitingOwnRebuild: false,
      }),
    ).toBe(false);
  });
});

describe("isOwnAnalyticsRebuildComplete", () => {
  it("does not complete on idle before lastOkAt advances", () => {
    expect(
      isOwnAnalyticsRebuildComplete(
        {
          state: "idle",
          lastOkAt: "2026-01-01T00:00:00.000Z",
        } as never,
        "2026-01-01T00:00:00.000Z",
        false,
      ),
    ).toBe(false);
  });

  it("completes when lastOkAt advances after save", () => {
    expect(
      isOwnAnalyticsRebuildComplete(
        {
          state: "idle",
          lastOkAt: "2026-01-02T00:00:00.000Z",
        } as never,
        "2026-01-01T00:00:00.000Z",
        false,
      ),
    ).toBe(true);
  });

  it("completes after running even if lastOkAt unchanged", () => {
    expect(
      isOwnAnalyticsRebuildComplete(
        {
          state: "idle",
          lastOkAt: "2026-01-01T00:00:00.000Z",
        } as never,
        "2026-01-01T00:00:00.000Z",
        true,
      ),
    ).toBe(true);
  });

  it("does not complete on idle with lastOkAt when save had no baseline until rebuild ran", () => {
    expect(
      isOwnAnalyticsRebuildComplete(
        {
          state: "idle",
          lastOkAt: "2026-01-01T00:00:00.000Z",
        } as never,
        null,
        false,
      ),
    ).toBe(false);
  });
});

describe("isEditorWorkspaceActionsLocked", () => {
  it("locks while Postgres reports a running rebuild", () => {
    expect(
      isEditorWorkspaceActionsLocked({
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: false,
        savingEntity: false,
      }),
    ).toBe(true);
  });

  it("locks while this tab saves or awaits its rebuild", () => {
    expect(
      isEditorWorkspaceActionsLocked({
        rebuildStatus: { state: "idle" } as never,
        awaitingOwnRebuild: true,
        savingEntity: false,
      }),
    ).toBe(true);
    expect(
      isEditorWorkspaceActionsLocked({
        rebuildStatus: { state: "idle" } as never,
        awaitingOwnRebuild: false,
        savingEntity: true,
      }),
    ).toBe(true);
  });

  it("is open when idle and not saving", () => {
    expect(
      isEditorWorkspaceActionsLocked({
        rebuildStatus: { state: "idle" } as never,
        awaitingOwnRebuild: false,
        savingEntity: false,
      }),
    ).toBe(false);
  });
});

describe("isCmsSidebarNavReady", () => {
  it("waits while the page list is loading", () => {
    expect(
      isCmsSidebarNavReady({
        loadingPages: true,
        pages: [{ slug: "acid", path: "acid.md", title: "ACID" }],
        sourcesLoading: false,
        allSourcesLoaded: false,
      }),
    ).toBe(false);
  });

  it("opens when every list item has a frontmatter title", () => {
    expect(
      isCmsSidebarNavReady({
        loadingPages: false,
        pages: [{ slug: "acid", path: "acid.md", title: "ACID" }],
        sourcesLoading: true,
        allSourcesLoaded: false,
      }),
    ).toBe(true);
  });

  it("waits for the full catalog when list titles are incomplete", () => {
    expect(
      isCmsSidebarNavReady({
        loadingPages: false,
        pages: [{ slug: "acid", path: "acid.md" }],
        sourcesLoading: true,
        allSourcesLoaded: false,
      }),
    ).toBe(false);
  });
});

describe("resolveCmsHeaderIndicatorOverride", () => {
  it("prioritizes stale over success and rebuild", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: true,
        savingPage: false,
        cloudSaveIndicatorAt: "2026-01-01T17:30:00.000Z",
        saveBlockReason: "rebuild",
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
      }),
    ).toEqual({ phase: "unknown", label: CMS_CATALOG_STALE_MESSAGE });
  });

  it("shows yellow unsaved changes before cloud save success", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: "2026-06-15T14:35:00.000Z",
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
        hasUnsavedChanges: true,
      }),
    ).toEqual({
      phase: "updating",
      label: "Cambios sin guardar. Usá el ícono de guardar.",
    });
  });

  it("shows Guardando while Storage writes are in flight", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: true,
        cloudSaveIndicatorAt: "2026-01-01T17:30:00.000Z",
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_SAVING_PAGE_LABEL });
  });

  it("shows Actualizando while awaiting own rebuild before Postgres reports running", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: null,
        awaitingOwnRebuild: true,
        rebuildStatus: { state: "idle" } as never,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_UPDATING_ANALYTICS_LABEL });
  });

  it("shows yellow while loading or rebuilding", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: "loading",
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_LOADING_CATALOG_LABEL });
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        entityBaselineSyncedAt: "2026-06-15T14:35:00.000Z",
        saveBlockReason: "loading",
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
        hasUnsavedChanges: false,
      }),
    ).toEqual({
      phase: "updated",
      label: formatCmsCloudSaveIndicatorLabel("2026-06-15T14:35:00.000Z"),
    });
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: "rebuild",
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "running" } as never,
      }),
    ).toBeNull();
  });

  it("defers cloud-save green while another session rebuilds", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: "2026-06-15T14:35:00.000Z",
        saveBlockReason: "rebuild",
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "running" } as never,
      }),
    ).toBeNull();
  });

  it("shows green when editor matches server baseline after undo", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        entityBaselineSyncedAt: "2026-06-15T14:35:00.000Z",
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
        hasUnsavedChanges: false,
      }),
    ).toEqual({
      phase: "updated",
      label: formatCmsCloudSaveIndicatorLabel("2026-06-15T14:35:00.000Z"),
    });
  });

  it("shows green cloud save with local HH:MM after rebuild completes", () => {
    const savedAt = "2026-06-15T14:35:00.000Z";
    expect(
      resolveCmsHeaderIndicatorOverride({
        entityStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: savedAt,
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        rebuildStatus: { state: "idle" } as never,
      }),
    ).toEqual({
      phase: "updated",
      label: formatCmsCloudSaveIndicatorLabel(savedAt),
    });
  });
});

describe("formatCmsCloudSaveIndicatorLabel", () => {
  it("appends YYYY.MM.DD a las HH:MM in local time", () => {
    const label = formatCmsCloudSaveIndicatorLabel("2026-06-15T14:35:00.000Z");
    expect(label.startsWith(CMS_SAVE_SUCCESS_INDICATOR_LABEL)).toBe(true);
    expect(label).toMatch(/\d{4}\.\d{2}\.\d{2} a las \d{2}:\d{2}$/);
  });
});

describe("resolveCmsSaveBlockReason", () => {
  it("prioritizes stale over rebuild", () => {
    expect(
      resolveCmsSaveBlockReason({
        entityStale: true,
        sourcesLoading: false,
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: false,
        hasBlockingDiagnostics: false,
      }),
    ).toBe("stale");
  });

  it("blocks on awaiting own rebuild before idle is observed", () => {
    expect(
      resolveCmsSaveBlockReason({
        entityStale: false,
        sourcesLoading: false,
        rebuildStatus: null,
        awaitingOwnRebuild: true,
        hasBlockingDiagnostics: false,
      }),
    ).toBe("rebuild");
  });

  it("blocks save on every tab while Postgres reports a running rebuild", () => {
    expect(
      resolveCmsSaveBlockReason({
        entityStale: false,
        sourcesLoading: false,
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: false,
        hasBlockingDiagnostics: false,
      }),
    ).toBe("rebuild");
    expect(isCmsRebuildSaveBlocked({ state: "running" } as never, false)).toBe(true);
  });

  it("blocks while awaiting own rebuild even if Postgres is still idle", () => {
    expect(isCmsRebuildSaveBlocked({ state: "idle" } as never, true)).toBe(true);
  });
});
