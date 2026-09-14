import {
  buildGraphFromPages,
  collectDiagnostics,
  createLoadedConfig,
  Diagnostic,
  PageSource,
  ResourceCatalogEntry,
} from "@pps/core";

const expectedCurriculum = {
  years: [
    {
      title: "año 1" as const,
      courses: ["algoritmos y estructuras de datos", "programación i"],
    },
  ],
};

export function runDiagnosticsForEditor(
  currentSlug: string,
  currentContent: string,
  allPages: PageSource[],
  resources: ResourceCatalogEntry[] = [],
): Diagnostic[] {
  const sources = allPages.map((page) =>
    page.path.replace(/\.md$/i, "") === currentSlug ? { ...page, content: currentContent } : page,
  );
  const config = createLoadedConfig(expectedCurriculum);
  const graph = buildGraphFromPages({
    sources,
    config,
    generatedAt: new Date().toISOString(),
    resources,
  });
  return collectDiagnostics(graph);
}

export function hasBlockingDiagnostics(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.severity === "error" || diagnostic.severity === "warning",
  );
}
