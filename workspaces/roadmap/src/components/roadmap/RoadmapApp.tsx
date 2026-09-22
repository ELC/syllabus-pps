import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { loadAnalyticsArtifact } from "@pps/content/browser";
import { MetaDropdown } from "@pps/shell/MetaDropdown";
import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import editSvg from "@pps/shell/assets/icons/resource-edit.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import {
  courseRoadmapAsDegreeRoadmap,
  hydrateCurriculumGraph,
  projectAllCourseRoadmaps,
  projectCourseConceptRoadmap,
  projectDegreeRoadmap,
  type CurriculumGraph,
} from "@pps/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { ConceptPage } from "../../scripts/concept-panel";
import { buildAdjacency, topologicalStages } from "./adjacency";
import { buildRoadmapFlow } from "./build-flow";
import { EMPTY_ROADMAP_CURATION, resolveRoadmapCuration, type RoadmapCuration } from "./curation";
import {
  conceptLayoutDocumentFromCuration,
  parseConceptLayoutDocument,
  sliceCurationForCourse,
} from "./concept-curation";
import {
  attachSideConcept,
  branchOwnerForConcept,
  canShiftConceptInOrder,
  inferLayoutBranchOwner,
  mergeTrunkFork,
  promoteConceptToSpine,
  sanitizeTrunkForkCuration,
  separateSpineRangeToBranches,
  shiftConceptInOrder,
} from "./concept-curation-ops";
import {
  conceptEditHintForTool,
  type ConceptEditTool,
} from "./concept-edit-tools";
import { RoadmapConceptEditToolbar } from "./RoadmapConceptEditToolbar";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";
import { loadConceptLayout, saveConceptLayout } from "../../api/concept-layout";
import { buildCourseRoadmapLayout } from "./course-layout";
import { readCuratedCourseLayoutMetrics } from "./course-layout-metrics";
import { loadCourseLayout, saveCourseLayout } from "../../api/course-layout";
import type { RoadmapCourseLayoutDocument } from "@pps/content";
import {
  buildCourseRoadmapCuration,
  courseLayoutDocumentFromCuration,
  hasCuratedCourseGrid,
  moveAreaInCourseGrid,
  resolveAreaIdForTitle,
} from "./course-curation";
import { findNearestGridCell } from "./course-grid-cells";
import {
  CONCEPT_LAYOUT_SAVED_LABEL,
  CONCEPT_LAYOUT_UNSAVED_LABEL,
  conceptEditErrorLabel,
  GRID_LAYOUT_EDIT_HINT,
  GRID_LAYOUT_SAVED_LABEL,
  GRID_LAYOUT_UNSAVED_LABEL,
  gridLayoutStatusToSemaphore,
} from "./grid-layout-semaphore";
import { buildRoadmapLayout, type RoadmapBounds } from "./layout";
import { RoadmapCanvasSkeleton } from "./RoadmapCanvasSkeleton";
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

function normalizeCurriculumGraph(loaded: unknown): CurriculumGraph {
  let raw: unknown = loaded;

  if (typeof loaded === "string") {
    raw = parseGeneratedPayload<unknown>(loaded);
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (record.payload && typeof record.payload === "object") {
      raw = record.payload;
    } else if (record.body && typeof record.body === "object") {
      raw = record.body;
    }
  }

  return hydrateCurriculumGraph(raw as CurriculumGraph);
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
  onLoadingChange?: (loading: boolean) => void;
  onGridLayoutSemaphoreChange?: (
    override: ReturnType<typeof gridLayoutStatusToSemaphore>,
  ) => void;
  onGridLayoutEditHintChange?: (hint: string | null) => void;
}

export function RoadmapApp({
  onConceptOpen,
  onClosePanels,
  onProgressChange,
  onRegisterPanelUrlSync,
  onLoadingChange,
  onGridLayoutSemaphoreChange,
  onGridLayoutEditHintChange,
}: RoadmapAppProps) {
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<string>("");
  const [focusedCourseSlug, setFocusedCourseSlug] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [urlRevision, setUrlRevision] = useState(0);
  const [gridLayoutEditMode, setGridLayoutEditMode] = useState(false);
  const [conceptSubgraphEditMode, setConceptSubgraphEditMode] = useState(false);
  const [conceptEditTool, setConceptEditTool] = useState<ConceptEditTool>("select");
  const [conceptSelectedTopic, setConceptSelectedTopic] = useState<string | null>(null);
  const [branchRangeFirst, setBranchRangeFirst] = useState<string | null>(null);
  const [sidePendingOwner, setSidePendingOwner] = useState<string | null>(null);
  const [conceptCuration, setConceptCuration] = useState<RoadmapCuration | null>(null);
  const [conceptLayoutLoading, setConceptLayoutLoading] = useState(false);
  const [conceptLayoutReadyKey, setConceptLayoutReadyKey] = useState<string | null>(null);
  const [courseLayoutDocument, setCourseLayoutDocument] =
    useState<RoadmapCourseLayoutDocument | null>(null);
  const [courseLayoutLoading, setCourseLayoutLoading] = useState(false);
  const [courseLayoutReadySlug, setCourseLayoutReadySlug] = useState<string | null>(null);
  const [gridLayoutStatus, setGridLayoutStatus] = useState("");
  const lastAppliedUrlKeyRef = useRef<string | null>(null);

  useEffect(() => {
    void loadAnalyticsArtifact("curriculum-graph.json")
      .then((loaded) => {
        setGraph(normalizeCurriculumGraph(loaded));
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Failed to load roadmap data.");
      });
  }, []);

  useEffect(() => {
    onLoadingChange?.(!graph && !loadError);
  }, [graph, loadError, onLoadingChange]);

  useEffect(() => {
    onGridLayoutSemaphoreChange?.(gridLayoutStatusToSemaphore(gridLayoutStatus));
  }, [gridLayoutStatus, onGridLayoutSemaphoreChange]);

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
        return courseRoadmapAsDegreeRoadmap(activeCourseRoadmap);
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
    if (!activeCourseRoadmap || !focusedCourseSlug) {
      return;
    }

    const courseExists = activeCourseRoadmap.courses.some(
      (course) => course.slug === focusedCourseSlug,
    );
    if (!courseExists) {
      setFocusedCourseSlug(null);
    }
  }, [activeCourseRoadmap, focusedCourseSlug]);

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

  const conceptStageOf = useMemo(() => {
    if (!activeDegreeRoadmap || !adjacency) {
      return new Map<string, number>();
    }

    const stageOf = new Map<string, number>();
    topologicalStages(
      activeDegreeRoadmap.concepts.map((concept) => concept.title),
      adjacency,
    ).forEach((stage, index) => {
      for (const title of stage) {
        stageOf.set(title, index);
      }
    });
    return stageOf;
  }, [activeDegreeRoadmap, adjacency]);

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

  const slugToTitle = useMemo(
    () =>
      new Map(
        (activeDegreeRoadmap?.concepts ?? []).map((concept) => [
          concept.slug,
          concept.title,
        ]),
      ),
    [activeDegreeRoadmap],
  );

  useEffect(() => {
    if (!activeCourseRoadmap) {
      setCourseLayoutDocument(null);
      setCourseLayoutLoading(false);
      setCourseLayoutReadySlug(null);
      return;
    }

    let cancelled = false;
    const degreeSlug = activeCourseRoadmap.degreeSlug;
    setCourseLayoutLoading(true);
    setCourseLayoutDocument(null);
    setCourseLayoutReadySlug(null);
    setGridLayoutEditMode(false);
    setGridLayoutStatus("");

    void loadCourseLayout(degreeSlug)
      .then((layout) => {
        if (!cancelled) {
          setCourseLayoutDocument(layout);
          setCourseLayoutReadySlug(degreeSlug);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCourseLayoutDocument(null);
          setCourseLayoutReadySlug(degreeSlug);
          setGridLayoutStatus(
            error instanceof Error ? error.message : "No se pudo cargar la grilla desde la nube.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCourseLayoutLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourseRoadmap?.degreeSlug]);

  useEffect(() => {
    if (!isConceptView || !activeCourseRoadmap || !activeDegreeRoadmap || !focusedCourseSlug) {
      setConceptCuration(null);
      setConceptLayoutLoading(false);
      setConceptLayoutReadyKey(null);
      setConceptSubgraphEditMode(false);
      return;
    }

    let cancelled = false;
    const degreeSlug = activeCourseRoadmap.degreeSlug;
    const courseSlug = focusedCourseSlug;
    const layoutKey = `${degreeSlug}:${courseSlug}`;
    const fallbackCuration = (() => {
      const degreeCur = resolveRoadmapCuration(degreeSlug);
      if (degreeCur) {
        return sliceCurationForCourse(degreeCur, activeDegreeRoadmap);
      }

      return {
        ...EMPTY_ROADMAP_CURATION,
        degreeSlug: activeDegreeRoadmap.degreeSlug,
      };
    })();

    setConceptLayoutLoading(true);
    setConceptCuration(null);
    setConceptLayoutReadyKey(null);
    setConceptSubgraphEditMode(false);
    setConceptSelectedTopic(null);
    setBranchRangeFirst(null);
    setSidePendingOwner(null);
    setGridLayoutStatus("");

    void loadConceptLayout(degreeSlug, courseSlug)
      .then((document) => {
        if (cancelled) {
          return;
        }

        const parsed = parseConceptLayoutDocument(document, activeDegreeRoadmap);
        if (parsed) {
          sanitizeTrunkForkCuration(parsed);
        }
        setConceptCuration(parsed ?? fallbackCuration);
        setConceptLayoutReadyKey(layoutKey);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setConceptCuration(fallbackCuration);
          setConceptLayoutReadyKey(layoutKey);
          setGridLayoutStatus(
            error instanceof Error ? error.message : "No se pudo cargar el mapa de temas.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConceptLayoutLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCourseRoadmap,
    activeDegreeRoadmap,
    focusedCourseSlug,
    isConceptView,
  ]);

  const effectiveCourseCuration = useMemo(
    () =>
      activeCourseRoadmap
        ? buildCourseRoadmapCuration(activeCourseRoadmap.degreeSlug, courseLayoutDocument)
        : null,
    [activeCourseRoadmap, courseLayoutDocument],
  );

  const effectiveConceptCuration = useMemo(() => {
    if (!isConceptView || !conceptCuration) {
      return EMPTY_ROADMAP_CURATION;
    }

    return conceptCuration;
  }, [conceptCuration, isConceptView]);

  const layout = useMemo(() => {
    if (!activeDegreeRoadmap || !adjacency) {
      return null;
    }

    if (isConceptView) {
      return buildRoadmapLayout(activeDegreeRoadmap, adjacency, effectiveConceptCuration);
    }

    return buildCourseRoadmapLayout(
      activeDegreeRoadmap,
      adjacency,
      courseYearsByTitle,
      curatedLayoutMetrics,
      effectiveCourseCuration,
    );
  }, [
    activeDegreeRoadmap,
    adjacency,
    courseYearsByTitle,
    curatedLayoutMetrics,
    effectiveConceptCuration,
    effectiveCourseCuration,
    isConceptView,
  ]);

  const conceptLayoutKey =
    activeCourseRoadmap && focusedCourseSlug
      ? `${activeCourseRoadmap.degreeSlug}:${focusedCourseSlug}`
      : null;

  const showCourseLayoutSkeleton = Boolean(
    !isConceptView &&
      activeCourseRoadmap &&
      (courseLayoutLoading || courseLayoutReadySlug !== activeCourseRoadmap.degreeSlug),
  );

  const showConceptLayoutSkeleton = Boolean(
    isConceptView &&
      conceptLayoutKey &&
      (conceptLayoutLoading || conceptLayoutReadyKey !== conceptLayoutKey),
  );

  const showLayoutSkeleton = showCourseLayoutSkeleton || showConceptLayoutSkeleton;

  const canEditCourseGrid = Boolean(
    !isConceptView &&
      !showCourseLayoutSkeleton &&
      effectiveCourseCuration &&
      hasCuratedCourseGrid(effectiveCourseCuration) &&
      (layout?.courseGridCells?.length ?? 0) > 0,
  );

  const canEditConceptSubgraph = Boolean(
    isConceptView &&
      !showConceptLayoutSkeleton &&
      activeDegreeRoadmap &&
      activeDegreeRoadmap.concepts.length > 0 &&
      conceptCuration,
  );

  const layoutEditMode = gridLayoutEditMode || conceptSubgraphEditMode;
  const canEditLayout = canEditCourseGrid || canEditConceptSubgraph;

  const conceptEditBranchPhase = useMemo(() => {
    if (sidePendingOwner) {
      return "side-owner" as const;
    }
    if (branchRangeFirst) {
      return "range-first" as const;
    }
    return "idle" as const;
  }, [branchRangeFirst, sidePendingOwner]);

  const clearConceptEditPending = useCallback(() => {
    setConceptSelectedTopic(null);
    setBranchRangeFirst(null);
    setSidePendingOwner(null);
  }, []);

  const handleConceptEditToolChange = useCallback(
    (tool: ConceptEditTool) => {
      setConceptEditTool(tool);
      setBranchRangeFirst(null);
      setSidePendingOwner(null);
      if (tool !== "select") {
        setConceptSelectedTopic(null);
      }
    },
    [],
  );

  const conceptMoveAvailability = useMemo(() => {
    if (!conceptCuration || !conceptSelectedTopic) {
      return { up: false, down: false };
    }

    return {
      up: canShiftConceptInOrder(conceptCuration, conceptSelectedTopic, -1),
      down: canShiftConceptInOrder(conceptCuration, conceptSelectedTopic, 1),
    };
  }, [conceptCuration, conceptSelectedTopic]);

  const applyConceptOrderShift = useCallback(
    (direction: -1 | 1) => {
      if (!conceptCuration || !conceptSelectedTopic) {
        return;
      }

      const next = shiftConceptInOrder(conceptCuration, conceptSelectedTopic, direction);
      if (!next) {
        return;
      }

      setConceptCuration(next);
      setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
    },
    [conceptCuration, conceptSelectedTopic],
  );

  useEffect(() => {
    if (conceptSubgraphEditMode && canEditConceptSubgraph) {
      onGridLayoutEditHintChange?.(
        conceptEditHintForTool(conceptEditTool, conceptEditBranchPhase),
      );
      return;
    }

    onGridLayoutEditHintChange?.(
      gridLayoutEditMode && canEditCourseGrid ? GRID_LAYOUT_EDIT_HINT : null,
    );
  }, [
    canEditConceptSubgraph,
    canEditCourseGrid,
    conceptEditBranchPhase,
    conceptEditTool,
    conceptSubgraphEditMode,
    gridLayoutEditMode,
    onGridLayoutEditHintChange,
  ]);

  useEffect(() => {
    if (!conceptSubgraphEditMode) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        clearConceptEditPending();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearConceptEditPending, conceptSubgraphEditMode]);

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

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setFlowNodes((currentNodes) => {
      if (currentNodes.some((node) => node.dragging)) {
        return currentNodes;
      }

      const currentById = new Map(currentNodes.map((node) => [node.id, node]));

      return flow.nodes.map((node) => {
        const current = currentById.get(node.id);

        let next: Node = {
          ...node,
          position: current?.dragging ? current.position : node.position,
        };

        if (node.type === "roadmapCourse" && gridLayoutEditMode) {
          next = {
            ...next,
            draggable: true,
            dragHandle: ".roadmap__course-drag-surface",
            selected: false,
          };
        }

        if (node.type === "roadmapTopic" && conceptSubgraphEditMode) {
          next = {
            ...next,
            draggable: false,
            selected: false,
          };
        }

        if (node.type === "roadmapTopic" && conceptSubgraphEditMode) {
          const nodeData = node.data as RoadmapTopicNodeData;
          const classes = [
            conceptSelectedTopic === node.id ? "roadmap__node--concept-selected" : "",
            branchRangeFirst === node.id || sidePendingOwner === node.id
              ? "roadmap__node--branch-fork"
              : "",
            branchRangeFirst &&
            nodeData.role === "spine" &&
            node.id !== branchRangeFirst
              ? "roadmap__node--branch-join-target"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (classes) {
            next = { ...next, className: classes };
          }
        }

        return next;
      });
    });
  }, [
    branchRangeFirst,
    conceptSelectedTopic,
    sidePendingOwner,
    conceptSubgraphEditMode,
    flow.nodes,
    gridLayoutEditMode,
    setFlowNodes,
  ]);

  useEffect(() => {
    setFlowEdges(flow.edges);
  }, [flow.edges, setFlowEdges]);

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

  const degreeSelectOptions = useMemo(
    () =>
      courseRoadmaps.map((roadmap) => ({
        value: roadmap.degree,
        label: roadmap.degree,
      })),
    [courseRoadmaps],
  );

  const courseSelectOptions = useMemo(
    () => [
      { value: "", label: "Todas" },
      ...sortedCourses.map((course) => ({
        value: course.slug,
        label: course.title,
      })),
    ],
    [sortedCourses],
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

  const handleSaveCourseGrid = useCallback(() => {
    if (!activeCourseRoadmap || !effectiveCourseCuration) {
      return;
    }

    setGridLayoutStatus("Guardando…");

    void saveCourseLayout(
      activeCourseRoadmap.degreeSlug,
      courseLayoutDocumentFromCuration(effectiveCourseCuration),
    )
      .then(() => {
        setGridLayoutStatus(GRID_LAYOUT_SAVED_LABEL);
        setGridLayoutEditMode(false);
      })
      .catch((error: unknown) => {
        setGridLayoutStatus(
          error instanceof Error ? error.message : "No se pudo guardar la grilla.",
        );
      });
  }, [activeCourseRoadmap, effectiveCourseCuration]);

  const handleSaveConceptSubgraph = useCallback(() => {
    if (!activeCourseRoadmap || !focusedCourseSlug || !conceptCuration) {
      return;
    }

    setGridLayoutStatus("Guardando…");

    void saveConceptLayout(
      activeCourseRoadmap.degreeSlug,
      focusedCourseSlug,
      conceptLayoutDocumentFromCuration(conceptCuration),
    )
      .then(() => {
        setGridLayoutStatus(CONCEPT_LAYOUT_SAVED_LABEL);
        setConceptSubgraphEditMode(false);
        clearConceptEditPending();
      })
      .catch((error: unknown) => {
        setGridLayoutStatus(
          error instanceof Error ? error.message : "No se pudo guardar el mapa de temas.",
        );
      });
  }, [activeCourseRoadmap, clearConceptEditPending, conceptCuration, focusedCourseSlug]);

  const handleLayoutEditToggle = useCallback(() => {
    if (layoutEditMode) {
      if (conceptSubgraphEditMode) {
        handleSaveConceptSubgraph();
      } else {
        handleSaveCourseGrid();
      }
      return;
    }

    if (isConceptView) {
      setConceptSubgraphEditMode(true);
      setConceptEditTool("select");
      clearConceptEditPending();
    } else {
      setGridLayoutEditMode(true);
    }

    setGridLayoutStatus("");
  }, [
    clearConceptEditPending,
    conceptSubgraphEditMode,
    handleSaveConceptSubgraph,
    handleSaveCourseGrid,
    isConceptView,
    layoutEditMode,
  ]);

  const handleConceptEditNodeClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      if (!conceptSubgraphEditMode || !conceptCuration) {
        return;
      }

      if (node.type !== "roadmapTopic") {
        return;
      }

      const nodeData = node.data as RoadmapTopicNodeData;

      switch (conceptEditTool) {
        case "select": {
          setConceptSelectedTopic(node.id);
          setBranchRangeFirst(null);
          setSidePendingOwner(null);
          return;
        }
        case "branch": {
          if (nodeData.role !== "spine") {
            return;
          }

          if (!branchRangeFirst) {
            setBranchRangeFirst(node.id);
            setConceptSelectedTopic(node.id);
            return;
          }

          if (node.id === branchRangeFirst) {
            setBranchRangeFirst(null);
            setConceptSelectedTopic(null);
            return;
          }

          const separated = separateSpineRangeToBranches(
            conceptCuration,
            branchRangeFirst,
            node.id,
          );
          if (!separated.ok) {
            setGridLayoutStatus(conceptEditErrorLabel(separated.error));
            return;
          }

          setConceptCuration(separated.curation);
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        case "side": {
          if (!sidePendingOwner) {
            if (nodeData.role !== "spine") {
              return;
            }

            setSidePendingOwner(node.id);
            setConceptSelectedTopic(node.id);
            return;
          }

          if (node.id === sidePendingOwner) {
            setSidePendingOwner(null);
            setConceptSelectedTopic(null);
            return;
          }

          const attached = attachSideConcept(conceptCuration, sidePendingOwner, node.id);
          if (!attached.ok) {
            setGridLayoutStatus(conceptEditErrorLabel(attached.error));
            return;
          }

          setConceptCuration(attached.curation);
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        case "mergeFork": {
          const merged = mergeTrunkFork(conceptCuration, node.id);
          if (!merged.ok) {
            setGridLayoutStatus(conceptEditErrorLabel(merged.error));
            return;
          }

          setConceptCuration(merged.curation);
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        case "spine": {
          if (nodeData.role !== "branch") {
            return;
          }

          const inferredOwner =
            adjacency && conceptStageOf.size > 0
              ? inferLayoutBranchOwner(node.id, adjacency, conceptStageOf)
              : undefined;
          const promoted = promoteConceptToSpine(conceptCuration, node.id, {
            ownerTitle: inferredOwner,
          });
          if (!promoted.ok) {
            setGridLayoutStatus(conceptEditErrorLabel(promoted.error));
            return;
          }

          setConceptCuration(promoted.curation);
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        default:
          return;
      }
    },
    [
      adjacency,
      branchRangeFirst,
      clearConceptEditPending,
      sidePendingOwner,
      conceptCuration,
      conceptEditTool,
      conceptStageOf,
      conceptSubgraphEditMode,
    ],
  );

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (
        !gridLayoutEditMode ||
        !layout?.courseGridCells ||
        !effectiveCourseCuration ||
        !activeCourseRoadmap ||
        node.type !== "roadmapCourse"
      ) {
        return;
      }

      const width = node.width ?? node.measured?.width ?? 0;
      const height = node.height ?? node.measured?.height ?? 0;
      const centerX = node.position.x + width / 2;
      const centerY = node.position.y + height / 2;
      const targetCell = findNearestGridCell(layout.courseGridCells, centerX, centerY);
      if (!targetCell) {
        return;
      }

      const areaId = resolveAreaIdForTitle(
        effectiveCourseCuration,
        node.id,
        slugToTitle,
      );
      if (!areaId) {
        return;
      }

      const nextCuration = moveAreaInCourseGrid(effectiveCourseCuration, areaId, {
        year: targetCell.year,
        row: targetCell.row,
        column: targetCell.column,
      });

      setCourseLayoutDocument(courseLayoutDocumentFromCuration(nextCuration));
      setGridLayoutStatus(GRID_LAYOUT_UNSAVED_LABEL);
    },
    [
      activeCourseRoadmap,
      effectiveCourseCuration,
      gridLayoutEditMode,
      layout?.courseGridCells,
      slugToTitle,
    ],
  );

  if (loadError) {
    return <p className="roadmap__error">{loadError}</p>;
  }

  if (!graph) {
    return null;
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
          <div className="roadmap__degree-field">
            <span className="roadmap__degree-label">Carrera</span>
            <MetaDropdown
              className="roadmap__toolbar-dropdown"
              ariaLabel="Carrera"
              value={activeCourseRoadmap.degree}
              options={degreeSelectOptions}
              onChange={(degree) => {
                setSelectedDegree(degree);
                setFocusedCourseSlug(null);
                const roadmap = courseRoadmaps.find((entry) => entry.degree === degree);
                if (roadmap) {
                  syncPanelUrl({ degree: roadmap.degreeSlug });
                }
                onClosePanels?.();
              }}
            />
          </div>

          <div className="roadmap__degree-field roadmap__course-field">
            <span className="roadmap__degree-label">Materia</span>
            <MetaDropdown
              className="roadmap__toolbar-dropdown"
              ariaLabel="Materia"
              value={focusedCourseSlug ?? ""}
              options={courseSelectOptions}
              maxVisibleRows={10}
              onChange={handleCourseSelect}
            />
          </div>
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
        className={`roadmap__canvas-panel${hasConceptGraph ? "" : " roadmap__canvas-panel--empty"}${layoutEditMode ? " roadmap__canvas-panel--grid-edit" : ""}`}
        aria-label={isConceptView ? "Mapa de conceptos de la materia" : "Mapa de materias"}
      >
        {showLayoutSkeleton ? (
          <RoadmapCanvasSkeleton />
        ) : hasConceptGraph ? (
          <RoadmapProgressContext.Provider value={progress}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onFlowNodesChange}
              onEdgesChange={onFlowEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={gridLayoutEditMode}
              nodesConnectable={false}
              elementsSelectable={false}
              selectNodesOnDrag={false}
              panOnDrag={layoutEditMode ? [1, 2] : true}
              nodeDragThreshold={2}
              minZoom={0.2}
              maxZoom={1.5}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={(event, node) => {
                if (conceptSubgraphEditMode) {
                  handleConceptEditNodeClick(event, node);
                  return;
                }

                if (layoutEditMode) {
                  return;
                }

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
              {canEditLayout ? (
                <Panel position="top-right" className="roadmap__grid-layout-panel">
                  {conceptSubgraphEditMode ? (
                    <RoadmapConceptEditToolbar
                      activeTool={conceptEditTool}
                      onToolChange={handleConceptEditToolChange}
                      canMoveUp={conceptMoveAvailability.up}
                      canMoveDown={conceptMoveAvailability.down}
                      onMoveUp={() => applyConceptOrderShift(-1)}
                      onMoveDown={() => applyConceptOrderShift(1)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="roadmap__grid-layout-toggle"
                    aria-pressed={layoutEditMode}
                    onClick={handleLayoutEditToggle}
                    aria-label={
                      layoutEditMode
                        ? isConceptView
                          ? "Guardar mapa de temas"
                          : "Guardar grilla"
                        : isConceptView
                          ? "Editar mapa de temas"
                          : "Editar posiciones de la grilla"
                    }
                    title={
                      layoutEditMode
                        ? isConceptView
                          ? "Guardar mapa de temas"
                          : "Guardar grilla"
                        : isConceptView
                          ? "Editar mapa de temas"
                          : "Editar posiciones"
                    }
                  >
                    <SvgAssetIcon
                      svg={layoutEditMode ? saveSvg : editSvg}
                      className="roadmap__grid-layout-toggle-icon"
                      focusable={false}
                    />
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
