import { CurriculumGraph, EdgeKind, PageKind } from "../types";

export interface CytoscapeElementNode {
  data: {
    id: string;
    label: string;
    kind: PageKind;
    slug: string;
    path: string;
  };
}

export interface CytoscapeElementEdge {
  data: {
    id: string;
    source: string;
    target: string;
    kind: EdgeKind;
    label: string;
  };
}

export interface CytoscapeGraphExport {
  elements: {
    nodes: CytoscapeElementNode[];
    edges: CytoscapeElementEdge[];
  };
}

export function exportToCytoscape(graph: CurriculumGraph): CytoscapeGraphExport {
  const pageTitles = new Set(graph.pages.map((page) => page.title));
  const nodes: CytoscapeElementNode[] = graph.pages.map((page) => ({
    data: {
      id: page.title,
      label: page.title,
      kind: page.kind,
      slug: page.slug,
      path: page.path,
    },
  }));

  const seen = new Set<string>();
  const edges: CytoscapeElementEdge[] = [];

  for (const edge of graph.edges) {
    if (!pageTitles.has(edge.source) || !pageTitles.has(edge.target)) {
      continue;
    }

    const key = `${edge.source}::${edge.target}::${edge.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    edges.push({
      data: {
        id: key,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        label: edge.kind,
      },
    });
  }

  return { elements: { nodes, edges } };
}
