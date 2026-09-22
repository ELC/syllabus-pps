import { describe, expect, it } from "vitest";

import {
  analyticsRebuildIndicatorLabel,
  analyticsRebuildIndicatorPhase,
  formatAnalyticsUpdatedIndicatorLabel,
} from "../../../content/src/analytics-rebuild-status-browser";

describe("analyticsRebuildIndicatorPhase", () => {
  it("shows updated when idle with lastOkAt and no error", () => {
    expect(
      analyticsRebuildIndicatorPhase({
        state: "idle",
        startedAt: null,
        finishedAt: "2026-01-01T00:00:00.000Z",
        lastError: null,
        lastOkAt: "2026-01-01T00:00:00.000Z",
        pageCount: 1,
        resourceCount: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("updated");
  });

  it("shows updated when a later rebuild failed but lastOkAt remains", () => {
    expect(
      analyticsRebuildIndicatorPhase({
        state: "idle",
        startedAt: null,
        finishedAt: "2026-01-02T00:00:00.000Z",
        lastError: "timeout",
        lastOkAt: "2026-01-01T00:00:00.000Z",
        pageCount: 1,
        resourceCount: 1,
        updatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).toBe("updated");
  });
});

describe("formatAnalyticsUpdatedIndicatorLabel", () => {
  it("uses zero-padded YYYY.MM.DD a las HH:MM in local time", () => {
    const label = formatAnalyticsUpdatedIndicatorLabel("2026-06-15T14:35:00.000Z");
    expect(label).toMatch(/^Actualizado al \d{4}\.\d{2}\.\d{2} a las \d{2}:\d{2}$/);
    const [, y, m, d, h, min] =
      /^Actualizado al (\d{4})\.(\d{2})\.(\d{2}) a las (\d{2}):(\d{2})$/.exec(label) ?? [];
    expect(Number(m)).toBeGreaterThanOrEqual(1);
    expect(Number(m)).toBeLessThanOrEqual(12);
    expect(Number(d)).toBeGreaterThanOrEqual(1);
    expect(Number(d)).toBeLessThanOrEqual(31);
    expect(Number(h)).toBeGreaterThanOrEqual(0);
    expect(Number(h)).toBeLessThanOrEqual(23);
    expect(Number(min)).toBeGreaterThanOrEqual(0);
    expect(Number(min)).toBeLessThanOrEqual(59);
    expect(y).toHaveLength(4);
  });
});

describe("analyticsRebuildIndicatorLabel", () => {
  it("includes lastOkAt timestamp when phase is updated", () => {
    const lastOkAt = "2026-01-01T12:00:00.000Z";
    expect(
      analyticsRebuildIndicatorLabel(
        {
          state: "idle",
          startedAt: null,
          finishedAt: lastOkAt,
          lastError: null,
          lastOkAt,
          pageCount: 1,
          resourceCount: 1,
          updatedAt: lastOkAt,
        },
        "updated",
      ),
    ).toBe(formatAnalyticsUpdatedIndicatorLabel(lastOkAt));
  });

  it("surfaces lastError instead of a generic unknown label", () => {
    expect(
      analyticsRebuildIndicatorLabel(
        {
          state: "idle",
          startedAt: null,
          finishedAt: null,
          lastError: "Missing analytics artifact",
          lastOkAt: null,
          pageCount: null,
          resourceCount: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        "unknown",
      ),
    ).toBe("Missing analytics artifact");
  });
});
