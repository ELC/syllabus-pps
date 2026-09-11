export function defaultCurriculumUrl(): string {
  const roadmapBase = import.meta.env.BASE_URL ?? "/roadmap/";
  const normalized = roadmapBase.endsWith("/") ? roadmapBase : `${roadmapBase}/`;
  return `${normalized}data/curriculum-graph.json`;
}
