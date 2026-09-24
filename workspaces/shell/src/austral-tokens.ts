/** Mirror of @pps/shell/styles/_tokens.scss for Cytoscape runtime. */

export const AUSTRAL = {
  azulPrimario: "#2E3092",
  azulHover: "#2429AA",
  azulClaro: "#5599DB",
  celesteSuave: "#D4EBFA",
  ingPrimary: "#5599DB",
  ingSecondary: "#7EB8E8",
  ingTertiary: "#A8D0F0",
  text: "#1E293B",
  muted: "#64748B",
  /** Neutral structural edges (no expansion highlight). */
  edgeStructural: "#9CA3AF",
  nodeDefaultBase: "#64748B",
} as const;

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((channel) => clamp255(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function mixHex(colorA: string, colorB: string, weightA: number): string {
  const [ar, ag, ab] = parseHex(colorA);
  const [br, bg, bb] = parseHex(colorB);
  return toHex([
    ar * weightA + br * (1 - weightA),
    ag * weightA + bg * (1 - weightA),
    ab * weightA + bb * (1 - weightA),
  ]);
}

export function tint(hex: string, baseWeight: number): string {
  return mixHex(hex, "#FFFFFF", baseWeight);
}

export function shade(hex: string, baseWeight: number): string {
  return mixHex(hex, "#000000", baseWeight);
}

/** Okabe–Ito base hues (colorblind-safe). Borders and edges derive from these. */
const GRAPH_KIND_BASES = [
  { kind: "degree", label: "Carrera", base: AUSTRAL.azulPrimario },
  { kind: "year", label: "Año", base: "#9D4470" },
  { kind: "course", label: "Materia", base: "#D97706" },
  { kind: "concept", label: "Concepto", base: "#009E73" },
] as const;

/** Distinct course border hues by año index within a degree (Okabe–Ito–aligned; matches Network). */
const YEAR_COURSE_BORDER_COLORS = [
  "#D97706",
  "#2E3092",
  "#9D4470",
  "#56B4E9",
  "#0072B2",
  "#CC79A7",
  "#009E73",
  "#F0E442",
] as const;

export function borderColorForYearIndex(yearIndex: number): string {
  const index = Math.max(1, yearIndex) - 1;
  return (
    YEAR_COURSE_BORDER_COLORS[index % YEAR_COURSE_BORDER_COLORS.length] ??
    kindStyleForKind("course").border
  );
}

export function courseYearPresentation(
  yearIndex: number,
  options: { spine?: boolean } = {},
): {
  borderColor: string;
  backgroundColor: string;
  progressBackgroundColor: string;
  progressFillColor: string;
} {
  const borderColor = borderColorForYearIndex(yearIndex);
  const spine = options.spine ?? false;
  return {
    borderColor,
    backgroundColor: tint(borderColor, spine ? 0.16 : 0.08),
    progressBackgroundColor: tint(borderColor, 0.08),
    progressFillColor: tint(borderColor, 0.24),
  };
}

export const AUSTRAL_GRAPH_NODE_KINDS = GRAPH_KIND_BASES.map(({ kind, label, base }) => ({
  kind,
  label,
  base,
  /** Hollow nodes in the graph; swatches use a light tint of the base. */
  fill: "transparent",
  swatchFill: tint(base, 0.22),
  border: base,
}));

export const AUSTRAL_GRAPH_TNE = {
  base: "#7B4FB3",
  fill: "transparent",
  swatchFill: tint("#7B4FB3", 0.22),
  border: "#7B4FB3",
} as const;

export function kindStyleForKind(kind: string): {
  base: string;
  fill: string;
  swatchFill: string;
  border: string;
} {
  const match = AUSTRAL_GRAPH_NODE_KINDS.find((item) => item.kind === kind);
  if (match) {
    return match;
  }

  const base = AUSTRAL.nodeDefaultBase;
  return {
    base,
    fill: "transparent",
    swatchFill: tint(base, 0.22),
    border: base,
  };
}

/** Default materia styling when año index is unknown (TNE uses year hue + dashed border in Network/Roadmap). */
export function courseNodeStyle(_trayecto?: string): {
  base: string;
  fill: string;
  swatchFill: string;
  border: string;
} {
  return kindStyleForKind("course");
}

/** Expansion / focus accents — only shades and tints of the anchor node's base. */
export function expansionShadesForBase(base: string): string[] {
  return [base, shade(base, 0.72), shade(base, 0.52), tint(base, 0.58)];
}
