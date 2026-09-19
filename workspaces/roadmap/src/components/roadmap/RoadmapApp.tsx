import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import { loadAnalyticsArtifact } from "@pps/content/browser";
import {
  courseRoadmapAsDegreeRoadmap,
  projectAllCourseRoadmaps,
  projectCourseConceptRoadmap,
  projectDegreeRoadmap,
  type CurriculumGraph,
} from "@pps/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConceptPage } from "../../scripts/concept-panel";
import { buildAdjacency } from "./adjacency";
import { buildRoadmapFlow } from "./build-flow";
import { EMPTY_ROADMAP_CURATION } from "./curation";
import { buildCourseRoadmapLayout } from "./course-layout";
import { readCuratedCourseLayoutMetrics } from "./course-layout-metrics";
import { buildRoadmapLayout, type RoadmapBounds } from "./layout";
import { RoadmapAnchorNode } from "./RoadmapAnchorNode";
import { RoadmapYearBandNode } from "./RoadmapYearBandNode";
import { RoadmapBranchEdge } from "./RoadmapBranchEdge";
import { RoadmapCourseEdge } from "./RoadmapCourseEdge";
import { RoadmapSpineEdge } from "./RoadmapSpineEdge";
import { RoadmapCourseNode } from "./RoadmapCourseNode";
import { RoadmapJunctionNode } from "./RoadmapJunctionNode";
import {
  remainingProgressPercent,
  RoadmapProgressContext,
  tallyStatuses,
  useRoadmapProgress,
  type RoadmapProgress,
} from "./progress";
import { RoadmapTopicNode } from "./RoadmapTopicNode";
import {
  readRoadmapPanelUrl,
  roadmapPanelUrlKey,
  writeRoadmapPanelUrl,
  type RoadmapPanelUrlState,
} from "../../scripts/roadmap-panel-url";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = {
  roadmapTopic: RoadmapTopicNode,
  roadmapCourse: RoadmapCourseNode,
  roadmapAnchor: RoadmapAnchorNode,
  roadmapJunction: RoadmapJunctionNode,
  roadmapYearBand: RoadmapYearBandNode,
};

const edgeTypes: EdgeTypes = {
  roadmapSpine: RoadmapSpineEdge,
  roadmapBranch: RoadmapBranchEdge,
  roadmapCourse: RoadmapCourseEdge,
};

const VIEWPORT_PADDING = 48;
/** Below this the labels stop being readable, so wide roadmaps are panned instead of shrunk. */
const MIN_READABLE_ZOOM = 0.55;
const MIN_COURSE_READABLE_ZOOM = 0.38;

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

function CanvasViewport({
  bounds,
  viewportKey,
  minReadableZoom = MIN_READABLE_ZOOM,
}: {
  bounds: RoadmapBounds;
  viewportKey: string;
  minReadableZoom?: number;
}) {
  const { setViewport } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  useEffect(() => {
    if (width === 0 || height === 0) {
      return;
    }

    const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const fitted = (width - VIEWPORT_PADDING * 2) / contentWidth;
    const zoom = Math.min(1, Math.max(minReadableZoom, fitted));
    const centerX = (bounds.minX + bounds.maxX) / 2;

    setViewport({
      x:
        fitted >= minReadableZoom
          ? width / 2 - centerX * zoom
          : VIEWPORT_PADDING - bounds.minX * zoom,
      y: VIEWPORT_PADDING - bounds.minY * zoom,
      zoom,
    });
  }, [bounds, height, minReadableZoom, setViewport, viewportKey, width]);

  return null;
}

interface RoadmapPanelUrlSync {
  markApplied: (state: RoadmapPanelUrlState) => void;
}

interface RoadmapAppProps {
  onConceptOpen?: (page: ConceptPage) => void;
  onClosePanels?: () => void;
  onProgressChange?: (progress: RoadmapProgress) => void;
  onRegisterPanelUrlSync?: (sync: RoadmapPanelUrlSync) => void;
}

export function RoadmapApp({
  onConceptOpen,
  onClosePanels,
  onProgressChange,
  onRegisterPanelUrlSync,
}: RoadmapAppProps) {
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<string>("");
  const [focusedCourseSlug, setFocusedCourseSlug] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [urlRevision, setUrlRevision] = useState(0);
  const lastAppliedUrlKeyRef = useRef<string | null>(null);

  useEffect(() => {
    void loadAnalyticsArtifact("curriculum-graph.json")
      .then((loaded) => {
        const payload =
          typeof loaded === "string"
            ? parseGeneratedPayload<CurriculumGraph>(loaded)
            : (loaded as CurriculumGraph);
        setGraph(payload);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Failed to load roadmap data.");
      });
  }, []);

  const courseRoadmaps = useMemo(
    () => (graph ? projectAllCourseRoadmaps(graph) : []),
    [graph],
  );
  const activeCourseRoadmap = useMemo(
    () =>
      courseRoadmaps.find((roadmap) => roadmap.degree === selectedDegree) ??
      courseRoadmaps[0] ??
      null,
    [courseRoadmaps, selectedDegree],
  );

  const isConceptView = focusedCourseSlug !== null;

  const activeDegreeRoadmap = useMemo(() => {
    if (!graph || !activeCourseRoadmap) {
      return null;
    }

    if (focusedCourseSlug) {
      const course = activeCourseRoadmap.courses.find(
        (entry) => entry.slug === focusedCourseSlug,
      );
      if (!course) {
        return null;
      }

      return projectCourseConceptRoadmap(graph, activeCourseRoadmap.degree, course.title);
    }

    return courseRoadmapAsDegreeRoadmap(activeCourseRoadmap);
  }, [activeCourseRoadmap, focusedCourseSlug, graph]);

  const focusedCourse = useMemo(
    () =>
      activeCourseRoadmap?.courses.find((course) => course.slug === focusedCourseSlug) ?? null,
    [activeCourseRoadmap, focusedCourseSlug],
  );

  useEffect(() => {
    if (courseRoadmaps.length === 0) {
      return;
    }

    const url = readRoadmapPanelUrl();
    if (url.degree) {
      const match = courseRoadmaps.find((roadmap) => roadmap.degreeSlug === url.degree);
      if (match) {
        setSelectedDegree(match.degree);
        if (url.course) {
          const course = match.courses.find((entry) => entry.slug === url.course);
          setFocusedCourseSlug(course ? url.course : null);
        } else {
          setFocusedCourseSlug(null);
        }
        return;
      }
    }

    if (!selectedDegree && courseRoadmaps[0]) {
      setSelectedDegree(courseRoadmaps[0].degree);
    }
  }, [courseRoadmaps, selectedDegree]);

  useEffect(() => {
    onRegisterPanelUrlSync?.({
      markApplied: (state) => {
        lastAppliedUrlKeyRef.current = roadmapPanelUrlKey(state);
      },
    });
  }, [onRegisterPanelUrlSync]);

  useEffect(() => {
    const onPopState = () => {
      lastAppliedUrlKeyRef.current = null;
      setUrlRevision((revision) => revision + 1);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const conceptPages = useMemo(() => {
    if (!graph) {
      return new Map<string, ConceptPage>();
    }

    return new Map(
      graph.pages
        .filter((page) => page.kind === "concept")
        .map((page) => [
          page.title,
          {
            slug: page.slug,
            title: page.title,
            kind: page.kind,
            blocks: page.blocks.map((block) => ({
              line: block.line,
              text: block.text,
              urls: block.urls.map((url) => ({ raw: url.raw, target: url.target })),
              citations: block.citations.map((citation) => ({
                raw: citation.raw,
                id: citation.id,
                resolved: citation.resolved,
              })),
            })),
          },
        ]),
    );
  }, [graph]);

  const adjacency = useMemo(
    () => (activeDegreeRoadmap ? buildAdjacency(activeDegreeRoadmap) : null),
    [activeDegreeRoadmap],
  );

  const courseYearsByTitle = useMemo(
    () =>
      new Map(
        (activeCourseRoadmap?.courses ?? []).map((course) => [course.title, course.year]),
      ),
    [activeCourseRoadmap],
  );

  const courseTrayectoByTitle = useMemo(
    () =>
      new Map(
        (activeCourseRoadmap?.courses ?? []).map((course) => [course.title, course.trayecto]),
      ),
    [activeCourseRoadmap],
  );

  const curatedLayoutMetrics = useMemo(() => readCuratedCourseLayoutMetrics(), []);

  const layout = useMemo(() => {
    if (!activeDegreeRoadmap || !adjacency) {
      return null;
    }

    if (isConceptView) {
      return buildRoadmapLayout(activeDegreeRoadmap, adjacency, EMPTY_ROADMAP_CURATION);
    }

    return buildCourseRoadmapLayout(
      activeDegreeRoadmap,
      adjacency,
      courseYearsByTitle,
      curatedLayoutMetrics,
    );
  }, [
    activeDegreeRoadmap,
    adjacency,
    courseYearsByTitle,
    curatedLayoutMetrics,
    isConceptView,
  ]);

  const degreeConceptSlugByTitle = useMemo(() => {
    if (!graph || !activeCourseRoadmap) {
      return new Map<string, string>();
    }

    const degreeRoadmap = projectDegreeRoadmap(graph, activeCourseRoadmap.degree);
    return new Map(
      (degreeRoadmap?.concepts ?? []).map((concept) => [concept.title, concept.slug]),
    );
  }, [activeCourseRoadmap, graph]);

  const conceptsByCourseTitle = useMemo(
    () =>
      new Map(
        (activeCourseRoadmap?.courses ?? []).map((course) => [course.title, course.concepts]),
      ),
    [activeCourseRoadmap],
  );

  const conceptPageBySlug = useMemo(
    () => new Map([...conceptPages.values()].map((page) => [page.slug, page])),
    [conceptPages],
  );

  const resourceLinesBySlug = useMemo(() => {
    const linesBySlug = new Map<string, number[]>();

    for (const page of conceptPages.values()) {
      linesBySlug.set(
        page.slug,
        page.blocks.map((block) => block.line),
      );
    }

    return linesBySlug;
  }, [conceptPages]);

  const progress = useRoadmapProgress(
    activeCourseRoadmap?.degreeSlug ?? "",
    degreeConceptSlugByTitle,
    resourceLinesBySlug,
    conceptsByCourseTitle,
  );

  useEffect(() => {
    onProgressChange?.(progress);
  }, [onProgressChange, progress]);

  const progressCounts = useMemo(() => {
    if (isConceptView) {
      const titles = activeDegreeRoadmap?.concepts.map((concept) => concept.title) ?? [];
      return tallyStatuses(titles, (title) => progress.conceptProgressFor(title).status);
    }

    const titles = activeCourseRoadmap?.courses.map((course) => course.title) ?? [];
    return tallyStatuses(titles, (title) => progress.courseProgressFor(title).status);
  }, [activeCourseRoadmap, activeDegreeRoadmap, isConceptView, progress]);

  const flow = useMemo(
    () =>
      activeDegreeRoadmap && adjacency && layout
        ? buildRoadmapFlow({
            roadmap: activeDegreeRoadmap,
            adjacency,
            layout,
            isTopicDone: (title) =>
              isConceptView
                ? progress.statusFor(title) === "done"
                : progress.courseProgressFor(title).status === "done",
            topicNodeType: isConceptView ? "roadmapTopic" : "roadmapCourse",
            courseYearsByTitle,
            courseTrayectoByTitle,
            courseDagEdges: !isConceptView,
          })
        : { nodes: [], edges: [] },
    [
      activeDegreeRoadmap,
      adjacency,
      courseYearsByTitle,
      courseTrayectoByTitle,
      isConceptView,
      layout,
      progress.conceptProgressFor,
      progress.courseProgressFor,
      progress.statusFor,
    ],
  );

  useEffect(() => {
    setConfirmingReset(false);
  }, [activeCourseRoadmap, focusedCourseSlug]);

  useEffect(() => {
    if (!confirmingReset) {
      return;
    }

    const timer = window.setTimeout(() => setConfirmingReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingReset]);

  const syncPanelUrl = useCallback(
    (state: RoadmapPanelUrlState, mode: "replace" | "push" = "replace") => {
      writeRoadmapPanelUrl(state, mode);
      lastAppliedUrlKeyRef.current = roadmapPanelUrlKey(state);
    },
    [],
  );

  const handleConceptOpen = useCallback(
    (title: string) => {
      const page = conceptPages.get(title);
      const slug = degreeConceptSlugByTitle.get(title);
      if (activeCourseRoadmap && slug && focusedCourseSlug) {
        syncPanelUrl({
          degree: activeCourseRoadmap.degreeSlug,
          course: focusedCourseSlug,
          concept: slug,
        });
      }

      if (page && onConceptOpen) {
        onConceptOpen(page);
      }
    },
    [
      activeCourseRoadmap,
      conceptPages,
      focusedCourseSlug,
      onConceptOpen,
      degreeConceptSlugByTitle,
      syncPanelUrl,
    ],
  );

  const handleCourseOpen = useCallback(
    (title: string) => {
      const course = activeCourseRoadmap?.courses.find((entry) => entry.title === title);
      if (!activeCourseRoadmap || !course) {
        return;
      }

      setFocusedCourseSlug(course.slug);
      syncPanelUrl({ degree: activeCourseRoadmap.degreeSlug, course: course.slug }, "push");
      onClosePanels?.();
    },
    [activeCourseRoadmap, onClosePanels, syncPanelUrl],
  );

  const handleBackToCourses = useCallback(() => {
    if (!activeCourseRoadmap) {
      return;
    }

    setFocusedCourseSlug(null);
    syncPanelUrl({ degree: activeCourseRoadmap.degreeSlug }, "push");
    onClosePanels?.();
  }, [activeCourseRoadmap, onClosePanels, syncPanelUrl]);

  const sortedCourses = useMemo(
    () =>
      [...(activeCourseRoadmap?.courses ?? [])].sort(
        (left, right) =>
          left.year.localeCompare(right.year, "es-AR") ||
          left.title.localeCompare(right.title, "es-AR"),
      ),
    [activeCourseRoadmap],
  );

  const handleCourseSelect = useCallback(
    (slug: string) => {
      if (!activeCourseRoadmap) {
        return;
      }

      if (!slug) {
        handleBackToCourses();
        return;
      }

      const course = activeCourseRoadmap.courses.find((entry) => entry.slug === slug);
      if (course) {
        handleCourseOpen(course.title);
      }
    },
    [activeCourseRoadmap, handleBackToCourses, handleCourseOpen],
  );

  useEffect(() => {
    if (!activeCourseRoadmap || !graph) {
      return;
    }

    const url = readRoadmapPanelUrl();
    if (url.degree && url.degree !== activeCourseRoadmap.degreeSlug) {
      const match = courseRoadmaps.find((roadmap) => roadmap.degreeSlug === url.degree);
      if (match && match.degree !== activeCourseRoadmap.degree) {
        setSelectedDegree(match.degree);
      }
      return;
    }

    if (url.course !== focusedCourseSlug) {
      if (url.course) {
        const course = activeCourseRoadmap.courses.find((entry) => entry.slug === url.course);
        setFocusedCourseSlug(course ? url.course : null);
      } else {
        setFocusedCourseSlug(null);
      }
      return;
    }

    const urlKey = roadmapPanelUrlKey(url);
    if (lastAppliedUrlKeyRef.current === urlKey) {
      return;
    }

    if (url.concept && url.course) {
      const page = conceptPageBySlug.get(url.concept);
      if (page) {
        lastAppliedUrlKeyRef.current = urlKey;
        onConceptOpen?.(page);
      }
      return;
    }

    lastAppliedUrlKeyRef.current = urlKey;
    onClosePanels?.();
  }, [
    activeCourseRoadmap,
    conceptPageBySlug,
    courseRoadmaps,
    focusedCourseSlug,
    graph,
    onClosePanels,
    onConceptOpen,
    urlRevision,
  ]);

  const handleReset = useCallback(() => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }

    progress.reset();
    setConfirmingReset(false);
  }, [confirmingReset, progress]);

  if (loadError) {
    return <p className="roadmap__error">{loadError}</p>;
  }

  if (!graph) {
    return <p className="roadmap__loading">Cargando roadmap…</p>;
  }

  if (!activeCourseRoadmap || !layout || !activeDegreeRoadmap) {
    return <p className="roadmap__empty">No hay carreras con materias para mostrar.</p>;
  }

  const hasConceptGraph = !isConceptView || activeDegreeRoadmap.concepts.length > 0;

  const remaining = progressCounts.total - progressCounts.skipped;
  const percent = remainingProgressPercent(
    progressCounts.done,
    progressCounts.total,
    progressCounts.skipped,
  );
  const progressUnit = isConceptView ? "temas" : "materias";
  const progressScopeLabel = isConceptView
    ? (focusedCourse?.title ?? activeCourseRoadmap.degree)
    : activeCourseRoadmap.degree;
  const viewportKey = `${activeCourseRoadmap.degreeSlug}:${focusedCourseSlug ?? "courses"}`;

  return (
    <div className="roadmap">
      <div className="roadmap__toolbar">
        <div className="roadmap__toolbar-selectors">
          <label className="roadmap__degree-field">
            <span className="roadmap__degree-label">Carrera</span>
            <select
              className="roadmap__degree-select"
              value={activeCourseRoadmap.degree}
              onChange={(event) => {
                const degree = event.target.value;
                setSelectedDegree(degree);
                setFocusedCourseSlug(null);
                const roadmap = courseRoadmaps.find((entry) => entry.degree === degree);
                if (roadmap) {
                  syncPanelUrl({ degree: roadmap.degreeSlug });
                }
                onClosePanels?.();
              }}
            >
              {courseRoadmaps.map((roadmap) => (
                <option key={roadmap.degree} value={roadmap.degree}>
                  {roadmap.degree}
                </option>
              ))}
            </select>
          </label>

          <label className="roadmap__degree-field roadmap__course-field">
            <span className="roadmap__degree-label">Materia</span>
            <select
              className="roadmap__degree-select roadmap__course-select"
              value={focusedCourseSlug ?? ""}
              onChange={(event) => handleCourseSelect(event.target.value)}
            >
              <option value="">Todas</option>
              {sortedCourses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="roadmap__progress">
          <div className="roadmap__progress-head">
            <span className="roadmap__degree-label">Progreso</span>
            <span className="roadmap__progress-value">
              {progressCounts.done} de {remaining} {progressUnit} · {percent}%
            </span>
          </div>

          <div
            className="roadmap__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={remaining}
            aria-valuenow={progressCounts.done}
            aria-label={`${isConceptView ? "Temas" : "Materias"} completados en ${progressScopeLabel}`}
          >
            <span className="roadmap__progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="roadmap__progress-foot">
            <span className="roadmap__progress-meta">{progressCounts.skipped} omitidos</span>
            <button
              type="button"
              className={`roadmap__progress-reset${confirmingReset ? " roadmap__progress-reset--confirming" : ""}`}
              onClick={handleReset}
            >
              {confirmingReset ? "Confirmar reinicio" : "Reiniciar progreso"}
            </button>
          </div>
        </div>
      </div>

      <section
        className={`roadmap__canvas-panel${hasConceptGraph ? "" : " roadmap__canvas-panel--empty"}`}
        aria-label={isConceptView ? "Mapa de conceptos de la materia" : "Mapa de materias"}
      >
        {hasConceptGraph ? (
          <RoadmapProgressContext.Provider value={progress}>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              minZoom={0.2}
              maxZoom={1.5}
              onNodeClick={(_, node) => {
                if (node.type === "roadmapCourse") {
                  handleCourseOpen(node.id);
                  return;
                }

                if (node.type === "roadmapTopic") {
                  handleConceptOpen(node.id);
                }
              }}
            >
              <CanvasViewport
                bounds={layout.bounds}
                viewportKey={viewportKey}
                minReadableZoom={isConceptView ? MIN_READABLE_ZOOM : MIN_COURSE_READABLE_ZOOM}
              />
              {isConceptView ? (
                <Panel position="top-left" className="roadmap__graph-back">
                  <button type="button" className="roadmap__back-button" onClick={handleBackToCourses}>
                    ← Volver a materias
                  </button>
                </Panel>
              ) : null}
              <MiniMap pannable zoomable className="roadmap__minimap" nodeStrokeWidth={0} />
              <Controls className="roadmap__controls" showInteractive={false} />
              <Background gap={20} size={1} className="roadmap__background" />
            </ReactFlow>
          </RoadmapProgressContext.Provider>
        ) : (
          <>
            <div className="roadmap__graph-back">
              <button type="button" className="roadmap__back-button" onClick={handleBackToCourses}>
                ← Volver a materias
              </button>
            </div>
            <p className="roadmap__empty">
              {focusedCourse?.title ?? "Esta materia"} no tiene conceptos vinculados todavía.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
