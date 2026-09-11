export const GRAPH_NODE_KINDS = [
  { kind: "career", label: "Carrera", fill: "#ddd6fe", border: "#7c3aed" },
  { kind: "year", label: "Año", fill: "#fde68a", border: "#d97706" },
  { kind: "course", label: "Materia", fill: "#bbf7d0", border: "#059669" },
  { kind: "concept", label: "Concepto", fill: "#bfdbfe", border: "#2563eb" },
] as const;

export const GRAPH_FILTER_KINDS = GRAPH_NODE_KINDS.map(({ kind, label }) => ({
  kind,
  label,
}));

export function capitalizeWords(text: string): string {
  return text.replace(/(^|[\s-])(\p{L})/gu, (_match, prefix, letter) =>
    prefix + letter.toLocaleUpperCase("es-AR"),
  );
}

const GRAPH_LABEL_MAX_LINE_LENGTH = 11;

function wrapGraphLabelLines(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return text;
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > GRAPH_LABEL_MAX_LINE_LENGTH && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.join("\n");
}

export function formatGraphNodeLabel(label: string): string {
  const normalized = label.replace(/-/g, " ");
  return wrapGraphLabelLines(capitalizeWords(normalized));
}

export const EXPANSION_EDGE_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#4d7c0f",
] as const;
