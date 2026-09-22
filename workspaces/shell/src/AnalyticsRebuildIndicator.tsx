import {
  analyticsRebuildIndicatorLabel,
  analyticsRebuildIndicatorPhase,
  type AnalyticsRebuildStatus,
} from "@pps/content/browser";
import type { ReactElement } from "react";

export type PpsStatusIndicatorPhase = "updated" | "updating" | "unknown";

export interface PpsStatusIndicatorOverride {
  phase: PpsStatusIndicatorPhase;
  label: string;
}

export interface AnalyticsRebuildIndicatorProps {
  status: AnalyticsRebuildStatus | null;
  className?: string;
  /** While true, shows the yellow “Actualizando…” semaphore (e.g. initial app data load). */
  loading?: boolean;
  /** When set, takes precedence over analytics rebuild / loading state. */
  override?: PpsStatusIndicatorOverride | null;
  role?: "status" | "alert";
}

function RebuildPhaseIndicator({
  phase,
  label,
  className,
  role = "status",
}: {
  phase: ReturnType<typeof analyticsRebuildIndicatorPhase>;
  label: string;
  className?: string;
  role?: "status" | "alert";
}): ReactElement {
  return (
    <span
      className={["pps-rebuild-indicator", `pps-rebuild-indicator--${phase}`, className]
        .filter(Boolean)
        .join(" ")}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
    >
      <span className="pps-rebuild-indicator__dot" aria-hidden="true" />
      <span className="pps-rebuild-indicator__label">{label}</span>
    </span>
  );
}

export function AnalyticsRebuildIndicator({
  status,
  className,
  loading = false,
  override = null,
  role = "status",
}: AnalyticsRebuildIndicatorProps): ReactElement {
  const phase = override
    ? override.phase
    : loading
      ? "updating"
      : analyticsRebuildIndicatorPhase(status);
  const label = override ? override.label : analyticsRebuildIndicatorLabel(status, phase);

  return (
    <RebuildPhaseIndicator phase={phase} label={label} className={className} role={role} />
  );
}
