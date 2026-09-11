import { appBase, siteBase } from "@pps/shell/site-base";

export { siteBase };

export function defaultCurriculumUrl(): string {
  const roadmap = appBase("/roadmap/");
  if (roadmap.endsWith("roadmap/")) {
    return `${roadmap}data/curriculum-graph.json`;
  }
  return `${siteBase()}analytics/data/curriculum-graph.json`;
}
