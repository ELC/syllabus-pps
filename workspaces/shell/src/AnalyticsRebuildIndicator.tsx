import {
  analyticsRebuildIndicatorPhase,
  type AnalyticsRebuildStatus,
} from "@pps/content/browser";
import type { ReactElement } from "react";

const LABELS = {
  updated: "Actualizado",
  updating: "Actualizando...",
  unknown: "Estado desconocido",
} as const;

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
}

function RebuildPhaseIndicator({
  phase,
  label,
  className,
}: {
  phase: ReturnType<typeof analyticsRebuildIndicatorPhase>;
  label: string;
  className?: string;
}): ReactElement {
  return (
    <span
      className={["pps-rebuild-indicator", `pps-rebuild-indicator--${phase}`, className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
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
}: AnalyticsRebuildIndicatorProps): ReactElement {
  const phase = override
    ? override.phase
    : loading
      ? "updating"
      : analyticsRebuildIndicatorPhase(status);
  const label = override ? override.label : LABELS[phase];

  return <RebuildPhaseIndicator phase={phase} label={label} className={className} />;
}
