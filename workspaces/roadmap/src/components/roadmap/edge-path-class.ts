import type { EdgeProps } from "@xyflow/react";

export function roadmapEdgePathClassName({ className }: Pick<EdgeProps, "className">): string {
  const edgeModifiers = (className ?? "")
    .split(/\s+/)
    .filter((token) => token.startsWith("roadmap__edge--"))
    .map((token) => token.slice("roadmap__edge--".length));

  const pathModifiers = edgeModifiers
    .filter((modifier) => modifier !== "active" || !edgeModifiers.includes("done"))
    .map((modifier) => `roadmap__edge-path--${modifier}`);

  return ["roadmap__edge-path", ...pathModifiers].join(" ");
}
