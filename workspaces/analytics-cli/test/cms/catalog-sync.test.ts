import { describe, expect, it } from "vitest";

import {
  CMS_CATALOG_STALE_MESSAGE,
  CMS_HEADER_LOADING_CATALOG_LABEL,
  CMS_HEADER_SAVING_PAGE_LABEL,
  CMS_HEADER_SYNC_CHECK_LABEL,
  CMS_HEADER_UPDATING_ANALYTICS_LABEL,
  CMS_SAVE_SUCCESS_INDICATOR_LABEL,
  formatCmsCloudSaveIndicatorLabel,
  isCmsRebuildSaveBlocked,
  isCmsSidebarNavReady,
  isOwnAnalyticsRebuildComplete,
  reconcileCatalogSyncWithRebuildStatus,
  resolveCatalogAckAfterSourcesFetch,
  resolveCmsHeaderIndicatorOverride,
  resolveCmsSaveBlockReason,
  shouldMarkCatalogStale,
  shouldMarkCatalogStaleAfterSourcesFetch,
  shouldMarkCatalogStaleFromExternalRebuild,
} from "../../../cms/src/catalog-sync";

describe("shouldMarkCatalogStaleFromExternalRebuild", () => {
  it("marks stale when another session rebuild is running", () => {
    expect(
      shouldMarkCatalogStaleFromExternalRebuild({
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: false,
        savingPage: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toBe(true);
  });

  it("does not mark stale while this tab saves or awaits its rebuild", () => {
    expect(
      shouldMarkCatalogStaleFromExternalRebuild({
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: true,
        savingPage: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toBe(false);
    expect(
      shouldMarkCatalogStaleFromExternalRebuild({
        rebuildStatus: { state: "running" } as never,
        awaitingOwnRebuild: false,
        savingPage: true,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toBe(false);
  });
});

describe("shouldMarkCatalogStale", () => {
  it("marks stale when lastOkAt advances after acknowledgement", () => {
    expect(
      shouldMarkCatalogStale(
        "2026-01-02T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
        false,
        true,
      ),
    ).toBe(true);
  });

  it("does not mark stale while awaiting own rebuild", () => {
    expect(
      shouldMarkCatalogStale(
        "2026-01-02T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
        true,
        true,
      ),
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
        catalogStale: true,
        savingPage: false,
        cloudSaveIndicatorAt: "2026-01-01T17:30:00.000Z",
        saveBlockReason: "rebuild",
        awaitingOwnRebuild: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toEqual({ phase: "unknown", label: CMS_CATALOG_STALE_MESSAGE });
  });

  it("shows Guardando while Storage writes are in flight", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: true,
        cloudSaveIndicatorAt: "2026-01-01T17:30:00.000Z",
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_SAVING_PAGE_LABEL });
  });

  it("shows Actualizando while awaiting own rebuild before Postgres reports running", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: null,
        awaitingOwnRebuild: true,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_UPDATING_ANALYTICS_LABEL });
  });

  it("shows yellow while loading or rebuilding", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: "loading",
        awaitingOwnRebuild: false,
        catalogReady: false,
        catalogSyncAcknowledged: false,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_LOADING_CATALOG_LABEL });
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: "rebuild",
        awaitingOwnRebuild: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_UPDATING_ANALYTICS_LABEL });
  });

  it("shows yellow until catalog sync is acknowledged", () => {
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: null,
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        catalogReady: true,
        catalogSyncAcknowledged: false,
      }),
    ).toEqual({ phase: "updating", label: CMS_HEADER_SYNC_CHECK_LABEL });
  });

  it("shows green cloud save with local HH:MM after rebuild completes", () => {
    const savedAt = "2026-06-15T14:35:00.000Z";
    expect(
      resolveCmsHeaderIndicatorOverride({
        catalogStale: false,
        savingPage: false,
        cloudSaveIndicatorAt: savedAt,
        saveBlockReason: null,
        awaitingOwnRebuild: false,
        catalogReady: true,
        catalogSyncAcknowledged: true,
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

describe("reconcileCatalogSyncWithRebuildStatus", () => {
  it("marks stale when lastOkAt advances after load baseline", () => {
    expect(
      reconcileCatalogSyncWithRebuildStatus({
        lastOkAt: "2026-01-02T00:00:00.000Z",
        catalogLoadedBaselineLastOkAt: "2026-01-01T00:00:00.000Z",
        acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
        catalogAcknowledged: true,
        awaitingOwnRebuild: false,
        catalogReady: true,
      }),
    ).toEqual({
      markStale: true,
      acknowledgedLastOkAt: null,
      setCatalogAcknowledged: false,
    });
  });

  it("acknowledges baseline when rebuild status arrives after sources load", () => {
    expect(
      reconcileCatalogSyncWithRebuildStatus({
        lastOkAt: "2026-01-01T00:00:00.000Z",
        catalogLoadedBaselineLastOkAt: "2026-01-01T00:00:00.000Z",
        acknowledgedLastOkAt: null,
        catalogAcknowledged: false,
        awaitingOwnRebuild: false,
        catalogReady: true,
      }),
    ).toEqual({
      markStale: false,
      acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
      setCatalogAcknowledged: true,
    });
  });

  it("marks stale on first sync when lastOkAt already advanced", () => {
    expect(
      reconcileCatalogSyncWithRebuildStatus({
        lastOkAt: "2026-01-02T00:00:00.000Z",
        catalogLoadedBaselineLastOkAt: "2026-01-01T00:00:00.000Z",
        acknowledgedLastOkAt: null,
        catalogAcknowledged: false,
        awaitingOwnRebuild: false,
        catalogReady: true,
      }),
    ).toEqual({
      markStale: true,
      acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
      setCatalogAcknowledged: true,
    });
  });
});

describe("shouldMarkCatalogStaleAfterSourcesFetch", () => {
  it("marks stale when lastOkAt advances during fetch", () => {
    expect(
      shouldMarkCatalogStaleAfterSourcesFetch(
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
        false,
      ),
    ).toBe(true);
  });

  it("ignores advance while awaiting own rebuild", () => {
    expect(
      shouldMarkCatalogStaleAfterSourcesFetch(
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
        true,
      ),
    ).toBe(false);
  });
});

describe("resolveCatalogAckAfterSourcesFetch", () => {
  it("acks fetch-start lastOkAt when stale during first load", () => {
    expect(
      resolveCatalogAckAfterSourcesFetch({
        fetchStartLastOkAt: "2026-01-01T00:00:00.000Z",
        endLastOkAt: "2026-01-02T00:00:00.000Z",
        awaitingOwnRebuild: false,
        catalogAlreadyAcknowledged: false,
      }),
    ).toEqual({
      acknowledgedLastOkAt: "2026-01-01T00:00:00.000Z",
      markStale: true,
      setAcknowledged: true,
    });
  });

  it("marks stale on refetch without resetting ack", () => {
    expect(
      resolveCatalogAckAfterSourcesFetch({
        fetchStartLastOkAt: "2026-01-01T00:00:00.000Z",
        endLastOkAt: "2026-01-02T00:00:00.000Z",
        awaitingOwnRebuild: false,
        catalogAlreadyAcknowledged: true,
      }),
    ).toEqual({
      acknowledgedLastOkAt: null,
      markStale: true,
      setAcknowledged: false,
    });
  });
});

describe("resolveCmsSaveBlockReason", () => {
  it("prioritizes stale over rebuild", () => {
    expect(
      resolveCmsSaveBlockReason({
        catalogStale: true,
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
        catalogStale: false,
        sourcesLoading: false,
        rebuildStatus: null,
        awaitingOwnRebuild: true,
        hasBlockingDiagnostics: false,
      }),
    ).toBe("rebuild");
  });

  it("blocks while awaiting own rebuild even if Postgres is still idle", () => {
    expect(
      isCmsRebuildSaveBlocked({ state: "idle" } as never, true),
    ).toBe(true);
  });
});
