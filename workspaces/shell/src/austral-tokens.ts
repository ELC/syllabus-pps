/** Mirror of @pps/shell/styles/tokens.css for Cytoscape runtime. */

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
  { kind: "career", label: "Carrera", base: AUSTRAL.azulPrimario },
  { kind: "year", label: "Año", base: "#9D4470" },
  { kind: "course", label: "Materia", base: "#D97706" },
  { kind: "concept", label: "Concepto", base: "#009E73" },
] as const;

export const AUSTRAL_GRAPH_NODE_KINDS = GRAPH_KIND_BASES.map(({ kind, label, base }) => ({
  kind,
  label,
  base,
  /** Hollow nodes in the graph; swatches use a light tint of the base. */
  fill: "transparent",
  swatchFill: tint(base, 0.22),
  border: base,
}));

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

/** Expansion / focus accents — only shades and tints of the anchor node's base. */
export function expansionShadesForBase(base: string): string[] {
  return [base, shade(base, 0.72), shade(base, 0.52), tint(base, 0.58)];
}
