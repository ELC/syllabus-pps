/** Wikilink display title for a concept or course node in a degree roadmap projection. */
export type DegreeRoadmapNodeTitle = string;

/** Concept title in a curated course concept map (same wire shape as {@link DegreeRoadmapNodeTitle}). */
export type RoadmapConceptTitle = DegreeRoadmapNodeTitle;

/** `public.roadmap_concept_layouts.degree_slug` (degree slug or course slug when course-scoped). */
export type RoadmapLayoutSlug = string;

/** Page slug paired with a display title in course grid curation. */
export type CurriculumPageSlug = string;

export type ReadonlyRoadmapConceptTitleSet = ReadonlySet<RoadmapConceptTitle>;

/** Move one step toward the start (-1) or end (+1) of the linear spine. */
export type LinearSpineShiftDirection = -1 | 1;
