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

export interface AnalyticsRebuildIndicatorProps {
  status: AnalyticsRebuildStatus | null;
  className?: string;
  /** While true, shows the yellow “Actualizando…” semaphore (e.g. initial app data load). */
  loading?: boolean;
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
}: AnalyticsRebuildIndicatorProps): ReactElement {
  const phase = loading ? "updating" : analyticsRebuildIndicatorPhase(status);
  const label = LABELS[phase];

  return <RebuildPhaseIndicator phase={phase} label={label} className={className} />;
}
