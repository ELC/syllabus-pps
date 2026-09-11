import { AUSTRAL_GRAPH_NODE_KINDS } from "@pps/shell/austral-tokens";

export { AUSTRAL_GRAPH_NODE_KINDS as GRAPH_NODE_KINDS };

export const GRAPH_FILTER_KINDS = AUSTRAL_GRAPH_NODE_KINDS.map(({ kind, label }) => ({
  kind,
  label,
}));

export function capitalizeWords(text: string): string {
  return text.replace(/(^|[\s-])(\p{L})/gu, (_match, prefix, letter) =>
    prefix + letter.toLocaleUpperCase("es-AR"),
  );
}

export function formatGraphNodeLabel(label: string): string {
  return capitalizeWords(label.replace(/-/g, " "));
}
