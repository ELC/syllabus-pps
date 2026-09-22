import {
  buildGraphFromPages,
  collectDiagnostics,
  emptyLoadedConfig,
  Diagnostic,
  PageSource,
  ResourceCatalogEntry,
} from "@pps/core";

export function runDiagnosticsForEditor(
  currentSlug: string,
  currentContent: string,
  allPages: PageSource[],
  resources: ResourceCatalogEntry[] = [],
): Diagnostic[] {
  const sources = allPages.map((page) =>
    page.path.replace(/\.md$/i, "") === currentSlug ? { ...page, content: currentContent } : page,
  );
  const config = emptyLoadedConfig();
  const graph = buildGraphFromPages({
    sources,
    config,
    generatedAt: new Date().toISOString(),
    resources,
  });
  return collectDiagnostics(graph);
}
