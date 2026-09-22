import {
  analyticsRebuildIndicatorLabel,
  analyticsRebuildIndicatorPhase,
  subscribeAnalyticsRebuildStatus,
  type AnalyticsRebuildIndicatorPhase,
  type AnalyticsRebuildStatus,
} from "@pps/content/browser";

function render(
  host: HTMLElement,
  status: AnalyticsRebuildStatus | null,
  phase: AnalyticsRebuildIndicatorPhase,
  extraClass?: string,
): void {
  host.className = ["pps-rebuild-indicator", `pps-rebuild-indicator--${phase}`, extraClass]
    .filter(Boolean)
    .join(" ");
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.replaceChildren();

  const dot = document.createElement("span");
  dot.className = "pps-rebuild-indicator__dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "pps-rebuild-indicator__label";
  label.textContent = analyticsRebuildIndicatorLabel(status, phase);

  host.append(dot, label);
}

/** Mount rebuild status UI for Astro/vanilla pages (Network, etc.). */
export function mountAnalyticsRebuildIndicator(
  host: HTMLElement,
  options: { className?: string } = {},
): () => void {
  const extraClass = options.className;

  return subscribeAnalyticsRebuildStatus((status) => {
    const phase = analyticsRebuildIndicatorPhase(status);
    render(host, status, phase, extraClass);
  });
}
