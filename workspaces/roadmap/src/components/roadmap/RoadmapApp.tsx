import {
  Background,
  Controls,
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
import { useAppAdmin } from "@pps/login/AppAdminContext";
import editSvg from "@pps/shell/assets/icons/resource-edit.svg?raw";
import saveSvg from "@pps/shell/assets/icons/ui-save.svg?raw";
import {
  buildDegreeRoadmapAdjacency,
  conceptEditErrorLabel,
  courseRoadmapAsDegreeRoadmap,
  EMPTY_ROADMAP_CURATION,
  hydrateCurriculumGraph,
  projectAllCourseRoadmaps,
  projectCourseConceptRoadmap,
  projectDegreeRoadmap,
  PageKind,
  resolveYearIndex,
  yearDisplayLabel,
  yearPagesForDegree,
  type CurriculumGraph,
  type RoadmapCuration,
} from "@pps/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { RoadmapWorkspaceNav } from "../../RoadmapHeaderWorkspaceLinks";

import type { ConceptPage } from "../../scripts/concept-panel";
import { buildRoadmapFlow, buildYearBandOverlays } from "./build-flow";
import {
  buildConceptCurationDebugExport,
  copyConceptCurationDebugExport,
} from "./concept-curation-debug-export";
import {
  conceptLayoutDocumentFromCuration,
  parseConceptLayoutDocument,
  prepareConceptLayoutForStorage,
} from "./concept-curation";
import { bootstrapConceptLayoutForCourse } from "./concept-curation-normalize";
import {
  conceptEditHintForTool,
  type ConceptEditTool,
} from "./concept-edit-tools";
import {
  ConceptCurationEditActionKind,
  type ConceptCurationEditAction,
} from "./concept-curation-edit-action";
import {
  canRedoConceptCuration,
  canUndoConceptCuration,
  cloneCurationSnapshot,
  createConceptCurationHistory,
  currentConceptCuration,
  pushConceptCurationHistory,
  redoConceptCurationHistory,
  type ConceptCurationHistory,
  undoConceptCurationHistory,
} from "./concept-curation-history";
import { RoadmapConceptEditToolbar } from "./RoadmapConceptEditToolbar";
import type { RoadmapTopicNodeData } from "./RoadmapTopicNode";
import { loadConceptLayout, saveConceptLayout } from "../../api/concept-layout";
import {
  buildCourseRoadmapLayout,
  stretchCourseRoadmapLayoutVertically,
  verticalStretchToFillViewport,
} from "./course-layout";
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
  GRID_LAYOUT_EDIT_HINT,
  GRID_LAYOUT_SAVED_LABEL,
  GRID_LAYOUT_UNSAVED_LABEL,
  gridLayoutStatusToSemaphore,
} from "./grid-layout-semaphore";
import { buildLinearConceptLayout, type RoadmapBounds } from "./layout";
import {
  ROADMAP_VIEWPORT_PADDING,
  viewportForRoadmapBounds,
} from "./roadmap-viewport";

export { viewportForRoadmapBounds } from "./roadmap-viewport";
import { RoadmapCanvasSkeleton } from "./RoadmapCanvasSkeleton";
import { RoadmapLoadingShell } from "./RoadmapLoadingShell";
import { RoadmapToolbarSkeleton } from "./RoadmapToolbarSkeleton";
import { RoadmapAnchorNode } from "./RoadmapAnchorNode";
import { RoadmapMiniMap } from "./RoadmapMiniMap";
import { RoadmapYearBandsLayer } from "./RoadmapYearBandsLayer";
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
import {
  buildRoadmapCourseSelectOptions,
  isRoadmapCourseGroupOptionValue,
} from "./roadmap-course-select-options";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = {
  roadmapTopic: RoadmapTopicNode,
  roadmapCourse: RoadmapCourseNode,
  roadmapAnchor: RoadmapAnchorNode,
  roadmapJunction: RoadmapJunctionNode,
};

const edgeTypes: EdgeTypes = {
  roadmapSpine: RoadmapSpineEdge,
  roadmapBranch: RoadmapBranchEdge,
  roadmapCourse: RoadmapCourseEdge,
};

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
  onViewportReady,
}: {
  bounds: RoadmapBounds;
  viewportKey: string;
  onViewportReady?: () => void;
}) {
  const { setViewport } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const readyForKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    readyForKeyRef.current = null;
  }, [viewportKey]);

  useLayoutEffect(() => {
    if (width === 0 || height === 0) {
      return;
    }

    setViewport(viewportForRoadmapBounds(bounds, width, height));

    if (readyForKeyRef.current === viewportKey) {
      return;
    }

    readyForKeyRef.current = viewportKey;
    requestAnimationFrame(() => {
      onViewportReady?.();
    });
  }, [bounds, height, onViewportReady, setViewport, viewportKey, width]);

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
  onWorkspaceNavChange?: (nav: RoadmapWorkspaceNav | null) => void;
}

export function RoadmapApp({
  onConceptOpen,
  onClosePanels,
  onProgressChange,
  onRegisterPanelUrlSync,
  onLoadingChange,
  onGridLayoutSemaphoreChange,
  onGridLayoutEditHintChange,
  onWorkspaceNavChange,
}: RoadmapAppProps) {
  const { isAdmin } = useAppAdmin();
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
  const [sidePendingOwner, setSidePendingOwner] = useState<string | null>(null);
  const [canvasPanelSize, setCanvasPanelSize] = useState({ width: 0, height: 0 });
  const canvasPanelRef = useRef<HTMLElement | null>(null);
  const [conceptCuration, setConceptCuration] = useState<RoadmapCuration | null>(null);
  const conceptCurationHistoryRef = useRef<ConceptCurationHistory | null>(null);
  const [conceptCurationHistoryTick, setConceptCurationHistoryTick] = useState(0);
  const [conceptLayoutLoading, setConceptLayoutLoading] = useState(false);
  const [conceptLayoutReadyKey, setConceptLayoutReadyKey] = useState<string | null>(null);
  const [courseLayoutDocument, setCourseLayoutDocument] =
    useState<RoadmapCourseLayoutDocument | null>(null);
  const [courseLayoutLoading, setCourseLayoutLoading] = useState(false);
  const [courseLayoutReadySlug, setCourseLayoutReadySlug] = useState<string | null>(null);
  const [canvasViewportReady, setCanvasViewportReady] = useState(false);
  const [gridLayoutStatus, setGridLayoutStatus] = useState("");
  const lastAppliedUrlKeyRef = useRef<string | null>(null);
  const courseLayoutEditBaselineRef = useRef<RoadmapCourseLayoutDocument | null>(null);
  const conceptCurationEditBaselineRef = useRef<RoadmapCuration | null>(null);

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
    onGridLayoutSemaphoreChange?.(gridLayoutStatusToSemaphore(gridLayoutStatus));
  }, [gridLayoutStatus, onGridLayoutSemaphoreChange]);

  const courseRoadmaps = useMemo(
    () => (graph ? projectAllCourseRoadmaps(graph) : []),
    [graph],
  );
  const activeCourseRoadmap = useMemo(() => {
    if (selectedDegree) {
      return (
        courseRoadmaps.find((roadmap) => roadmap.degree === selectedDegree) ??
        courseRoadmaps[0] ??
        null
      );
    }

    if (focusedCourseSlug) {
      return (
        courseRoadmaps.find((roadmap) =>
          roadmap.courses.some((entry) => entry.slug === focusedCourseSlug),
        ) ??
        courseRoadmaps[0] ??
        null
      );
    }

    return courseRoadmaps[0] ?? null;
  }, [courseRoadmaps, focusedCourseSlug, selectedDegree]);

  const isConceptView = focusedCourseSlug !== null;

  const viewportKey = useMemo(
    () => `${activeCourseRoadmap?.degreeSlug ?? "none"}:${focusedCourseSlug ?? "courses"}`,
    [activeCourseRoadmap?.degreeSlug, focusedCourseSlug],
  );

  useEffect(() => {
    setCanvasViewportReady(false);
  }, [viewportKey]);

  const handleCanvasViewportReady = useCallback(() => {
    setCanvasViewportReady(true);
  }, []);

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

    if (!url.degree && url.course) {
      setSelectedDegree("");
      setFocusedCourseSlug(url.course);
      return;
    }

    if (!url.degree && !url.course) {
      const first = courseRoadmaps[0];
      if (first) {
        setSelectedDegree(first.degree);
        setFocusedCourseSlug(null);
      }
    }
  }, [courseRoadmaps, urlRevision]);

  useEffect(() => {
    if (courseRoadmaps.length === 0 || focusedCourseSlug !== null) {
      return;
    }
    if (selectedDegree.trim()) {
      return;
    }
    const fallback = activeCourseRoadmap ?? courseRoadmaps[0];
    if (!fallback) {
      return;
    }
    setSelectedDegree(fallback.degree);
  }, [activeCourseRoadmap, courseRoadmaps, focusedCourseSlug, selectedDegree]);

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
        .filter((page) => page.kind === PageKind.Concept)
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
    () => (activeDegreeRoadmap ? buildDegreeRoadmapAdjacency(activeDegreeRoadmap) : null),
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

  const yearPageSlugByLabel = useMemo(() => {
    if (!graph || !activeCourseRoadmap) {
      return undefined;
    }
    const map = new Map<string, string>();
    for (const yearPage of yearPagesForDegree(graph.pages, activeCourseRoadmap.degree, {
      degreeSlug: activeCourseRoadmap.degreeSlug,
    })) {
      const yearIndex = resolveYearIndex(yearPage);
      if (!yearIndex) {
        continue;
      }
      map.set(yearDisplayLabel(yearIndex), yearPage.slug);
    }
    return map;
  }, [activeCourseRoadmap, graph]);

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
      conceptCurationHistoryRef.current = null;
      setConceptLayoutLoading(false);
      setConceptLayoutReadyKey(null);
      setConceptSubgraphEditMode(false);
      return;
    }

    let cancelled = false;
    const degreeSlug = activeCourseRoadmap.degreeSlug;
    const courseSlug = focusedCourseSlug;
    const layoutKey = `${degreeSlug}:${courseSlug}`;
    setConceptLayoutLoading(true);
    setConceptCuration(null);
    conceptCurationHistoryRef.current = null;
    setConceptLayoutReadyKey(null);
    setConceptSubgraphEditMode(false);
    setConceptSelectedTopic(null);
    setSidePendingOwner(null);
    setGridLayoutStatus("");

    void loadConceptLayout(degreeSlug, courseSlug)
      .then((document) => {
        if (cancelled) {
          return;
        }

        const parsed =
          document === null
            ? null
            : parseConceptLayoutDocument(document, activeDegreeRoadmap);
        const loaded =
          parsed ?? bootstrapConceptLayoutForCourse(activeDegreeRoadmap);

        if (document !== null && !parsed) {
          setGridLayoutStatus(
            "El layout en la nube no es válido; se generó uno nuevo desde el curso. Guardá para reemplazarlo.",
          );
        }
        conceptCurationHistoryRef.current = createConceptCurationHistory(loaded);
        setConceptCuration(loaded);
        setConceptCurationHistoryTick((tick) => tick + 1);
        setConceptLayoutReadyKey(layoutKey);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const recovered = bootstrapConceptLayoutForCourse(activeDegreeRoadmap);
          conceptCurationHistoryRef.current = createConceptCurationHistory(recovered);
          setConceptCuration(recovered);
          setConceptCurationHistoryTick((tick) => tick + 1);
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

  const conceptLinearLayout = useMemo(
    () =>
      isConceptView && conceptCuration
        ? conceptCuration.open().readLinearLayout()
        : null,
    [conceptCuration, isConceptView],
  );

  const layout = useMemo(() => {
    if (!activeDegreeRoadmap || !adjacency) {
      return null;
    }

    if (isConceptView) {
      return buildLinearConceptLayout(activeDegreeRoadmap, effectiveConceptCuration);
    }

    const baseLayout = buildCourseRoadmapLayout(
      activeDegreeRoadmap,
      adjacency,
      courseYearsByTitle,
      curatedLayoutMetrics,
      effectiveCourseCuration,
    );

    const stretch = verticalStretchToFillViewport(
      baseLayout.bounds,
      canvasPanelSize.width,
      canvasPanelSize.height,
      ROADMAP_VIEWPORT_PADDING,
    );

    return stretchCourseRoadmapLayoutVertically(baseLayout, courseYearsByTitle, stretch);
  }, [
    activeDegreeRoadmap,
    adjacency,
    canvasPanelSize.height,
    canvasPanelSize.width,
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

  const hasConceptGraph = Boolean(
    activeDegreeRoadmap && (!isConceptView || activeDegreeRoadmap.concepts.length > 0),
  );

  const initialViewport = useMemo(() => {
    if (!layout || canvasPanelSize.width <= 0 || canvasPanelSize.height <= 0) {
      return null;
    }

    return viewportForRoadmapBounds(
      layout.bounds,
      canvasPanelSize.width,
      canvasPanelSize.height,
    );
  }, [canvasPanelSize.height, canvasPanelSize.width, layout]);

  const showCanvasSkeleton = Boolean(
    showLayoutSkeleton ||
      (hasConceptGraph &&
        (canvasPanelSize.width <= 0 ||
          canvasPanelSize.height <= 0 ||
          !canvasViewportReady)),
  );

  const canMountFlow = Boolean(hasConceptGraph && !showLayoutSkeleton && initialViewport);

  const showToolbarSkeleton = Boolean(
    !graph || !layout || showCanvasSkeleton,
  );

  useEffect(() => {
    onLoadingChange?.((!graph && !loadError) || showToolbarSkeleton);
  }, [graph, loadError, onLoadingChange, showToolbarSkeleton]);

  useEffect(() => {
    const panel = canvasPanelRef.current;
    if (!panel) {
      return;
    }

    const updateSize = (): void => {
      setCanvasPanelSize({
        width: panel.clientWidth,
        height: panel.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [graph, isConceptView, layout]);

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
  const canEditLayout = isAdmin && (canEditCourseGrid || canEditConceptSubgraph);

  const conceptEditSidePhase = useMemo(() => {
    return sidePendingOwner ? ("side-owner" as const) : ("idle" as const);
  }, [sidePendingOwner]);

  const clearConceptEditPending = useCallback(() => {
    setConceptSelectedTopic(null);
    setSidePendingOwner(null);
  }, []);

  const commitConceptCurationEdit = useCallback(
    (next: RoadmapCuration, action: ConceptCurationEditAction) => {
      setConceptCuration(next);
      const history = conceptCurationHistoryRef.current;
      conceptCurationHistoryRef.current = history
        ? pushConceptCurationHistory(history, next, action)
        : createConceptCurationHistory(next, action);
      setConceptCurationHistoryTick((tick) => tick + 1);
    },
    [],
  );

  const undoConceptCurationEdit = useCallback(() => {
    const history = conceptCurationHistoryRef.current;
    if (!history) {
      return;
    }

    const undone = undoConceptCurationHistory(history);
    if (!undone) {
      return;
    }

    conceptCurationHistoryRef.current = undone;
    const restored = currentConceptCuration(undone);
    const curation = cloneCurationSnapshot(restored);
    setConceptCuration(curation);
    setConceptCurationHistoryTick((tick) => tick + 1);
    setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
  }, []);

  const redoConceptCurationEdit = useCallback(() => {
    const history = conceptCurationHistoryRef.current;
    if (!history) {
      return;
    }

    const redone = redoConceptCurationHistory(history);
    if (!redone) {
      return;
    }

    conceptCurationHistoryRef.current = redone;
    const restored = currentConceptCuration(redone);
    const curation = cloneCurationSnapshot(restored);
    setConceptCuration(curation);
    setConceptCurationHistoryTick((tick) => tick + 1);
    setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
  }, []);

  const conceptHistoryAvailability = useMemo(() => {
    void conceptCurationHistoryTick;
    const history = conceptCurationHistoryRef.current;
    if (!history) {
      return { undo: false, redo: false };
    }

    return {
      undo: canUndoConceptCuration(history),
      redo: canRedoConceptCuration(history),
    };
  }, [conceptCurationHistoryTick]);

  const showConceptCurationDebugExport = import.meta.env.DEV;

  const handleCopyConceptCurationDebugJson = useCallback(async () => {
    if (
      !conceptCuration ||
      !activeCourseRoadmap ||
      !focusedCourseSlug
    ) {
      return;
    }

    const payload = buildConceptCurationDebugExport({
      degreeSlug: activeCourseRoadmap.degreeSlug,
      courseSlug: focusedCourseSlug,
      curation: conceptCuration,
      history: conceptCurationHistoryRef.current,
      selectedTopic: conceptSelectedTopic,
      editTool: conceptEditTool,
    });

    try {
      await copyConceptCurationDebugExport(payload);
      setGridLayoutStatus("JSON del mapa copiado al portapapeles (debug).");
    } catch (error: unknown) {
      setGridLayoutStatus(
        error instanceof Error
          ? error.message
          : "No se pudo copiar el JSON al portapapeles.",
      );
    }
  }, [
    activeCourseRoadmap,
    conceptCuration,
    conceptEditTool,
    conceptSelectedTopic,
    focusedCourseSlug,
  ]);

  const handleConceptEditToolChange = useCallback(
    (tool: ConceptEditTool) => {
      setConceptEditTool(tool);
      setSidePendingOwner(null);
      if (tool !== "select") {
        setConceptSelectedTopic(null);
      }
    },
    [],
  );

  const canMoveConceptUp = useMemo(
    () =>
      Boolean(
        conceptLinearLayout?.isSuccess() &&
          conceptSelectedTopic &&
          conceptLinearLayout.canShift(conceptSelectedTopic, -1),
      ),
    [conceptLinearLayout, conceptSelectedTopic],
  );

  const canMoveConceptDown = useMemo(
    () =>
      Boolean(
        conceptLinearLayout?.isSuccess() &&
          conceptSelectedTopic &&
          conceptLinearLayout.canShift(conceptSelectedTopic, 1),
      ),
    [conceptLinearLayout, conceptSelectedTopic],
  );

  const applyConceptOrderShift = useCallback(
    (direction: -1 | 1) => {
      if (
        !conceptCuration ||
        !conceptSelectedTopic ||
        !conceptLinearLayout ||
        conceptLinearLayout.isFailure()
      ) {
        return;
      }

      const shifted = conceptLinearLayout.shift(conceptSelectedTopic, direction);
      if (shifted.isFailure()) {
        setGridLayoutStatus(conceptEditErrorLabel(shifted.error));
        return;
      }

      commitConceptCurationEdit(shifted.curation, {
        kind: ConceptCurationEditActionKind.Shift,
        title: conceptSelectedTopic,
        direction,
      });
      setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
    },
    [
      commitConceptCurationEdit,
      conceptLinearLayout,
      conceptSelectedTopic,
    ],
  );

  useEffect(() => {
    if (conceptSubgraphEditMode && canEditConceptSubgraph) {
      onGridLayoutEditHintChange?.(
        conceptEditHintForTool(conceptEditTool, conceptEditSidePhase),
      );
      return;
    }

    onGridLayoutEditHintChange?.(
      gridLayoutEditMode && canEditCourseGrid ? GRID_LAYOUT_EDIT_HINT : null,
    );
  }, [
    canEditConceptSubgraph,
    canEditCourseGrid,
    conceptEditSidePhase,
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
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        redoConceptCurationEdit();
      } else {
        undoConceptCurationEdit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearConceptEditPending,
    conceptSubgraphEditMode,
    redoConceptCurationEdit,
    undoConceptCurationEdit,
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
            yearPageSlugByLabel,
            courseDagEdges: !isConceptView,
          })
        : { nodes: [], edges: [] },
    [
      activeDegreeRoadmap,
      adjacency,
      courseYearsByTitle,
      courseTrayectoByTitle,
      yearPageSlugByLabel,
      isConceptView,
      layout,
      progress.conceptProgressFor,
      progress.courseProgressFor,
      progress.statusFor,
    ],
  );

  const yearBandOverlays = useMemo(
    () =>
      !isConceptView && layout
        ? buildYearBandOverlays(layout, yearPageSlugByLabel)
        : [],
    [isConceptView, layout, yearPageSlugByLabel],
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
            sidePendingOwner === node.id ? "roadmap__node--branch-fork" : "",
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
    (state: RoadmapPanelUrlState, mode: "replace" | "push" = "push") => {
      writeRoadmapPanelUrl(state, mode);
      lastAppliedUrlKeyRef.current = roadmapPanelUrlKey(state);
    },
    [],
  );

  const syncPanelUrlForScope = useCallback(
    (state: RoadmapPanelUrlState, mode: "replace" | "push" = "push") => {
      if (!selectedDegree) {
        const { degree: _degree, ...withoutDegree } = state;
        syncPanelUrl(withoutDegree, mode);
        return;
      }
      syncPanelUrl(state, mode);
    },
    [selectedDegree, syncPanelUrl],
  );

  const handleConceptOpen = useCallback(
    (title: string) => {
      const page = conceptPages.get(title);
      const slug = degreeConceptSlugByTitle.get(title);
      if (activeCourseRoadmap && slug && focusedCourseSlug) {
        syncPanelUrlForScope({
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
      syncPanelUrlForScope,
    ],
  );

  const handleCourseOpen = useCallback(
    (title: string) => {
      const course = activeCourseRoadmap?.courses.find((entry) => entry.title === title);
      if (!activeCourseRoadmap || !course) {
        return;
      }

      setFocusedCourseSlug(course.slug);
      syncPanelUrlForScope(
        { degree: activeCourseRoadmap.degreeSlug, course: course.slug },
        "push",
      );
      onClosePanels?.();
    },
    [activeCourseRoadmap, onClosePanels, syncPanelUrlForScope],
  );

  const handleBackToCourses = useCallback(() => {
    if (!activeCourseRoadmap) {
      return;
    }

    setFocusedCourseSlug(null);
    if (!selectedDegree.trim()) {
      setSelectedDegree(activeCourseRoadmap.degree);
    }
    syncPanelUrl({ degree: activeCourseRoadmap.degreeSlug }, "push");
    onClosePanels?.();
  }, [activeCourseRoadmap, onClosePanels, selectedDegree, syncPanelUrl]);

  const degreeSelectOptions = useMemo(
    () => [
      {
        value: "",
        label: "Todas",
        disabled: focusedCourseSlug === null,
      },
      ...courseRoadmaps.map((roadmap) => ({
        value: roadmap.degree,
        label: roadmap.degree,
      })),
    ],
    [courseRoadmaps, focusedCourseSlug],
  );

  const courseSelectOptions = useMemo(
    () =>
      buildRoadmapCourseSelectOptions(
        graph,
        activeCourseRoadmap,
        Boolean(selectedDegree.trim()),
      ),
    [activeCourseRoadmap, graph, selectedDegree],
  );

  const handleCourseSelect = useCallback(
    (slug: string) => {
      if (!activeCourseRoadmap) {
        return;
      }

      if (!slug || isRoadmapCourseGroupOptionValue(slug)) {
        if (!slug) {
          handleBackToCourses();
        }
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

    if (focusedCourseSlug && focusedCourse) {
      progress.reset({ courseTitle: focusedCourse.title });
    } else {
      progress.reset();
    }

    setConfirmingReset(false);
  }, [confirmingReset, focusedCourse, focusedCourseSlug, progress]);

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
        courseLayoutEditBaselineRef.current = null;
        setGridLayoutEditMode(false);
      })
      .catch((error: unknown) => {
        setGridLayoutStatus(
          error instanceof Error ? error.message : "No se pudo guardar la grilla.",
        );
      });
  }, [activeCourseRoadmap, effectiveCourseCuration]);

  const handleSaveConceptSubgraph = useCallback(() => {
    if (!activeCourseRoadmap || !activeDegreeRoadmap || !focusedCourseSlug || !conceptCuration) {
      return;
    }

    setGridLayoutStatus("Guardando…");

    const stored = prepareConceptLayoutForStorage(conceptCuration, activeDegreeRoadmap);

    void saveConceptLayout(
      activeCourseRoadmap.degreeSlug,
      focusedCourseSlug,
      conceptLayoutDocumentFromCuration(stored),
    )
      .then(() => {
        setGridLayoutStatus(CONCEPT_LAYOUT_SAVED_LABEL);
        conceptCurationEditBaselineRef.current = null;
        setConceptSubgraphEditMode(false);
        clearConceptEditPending();
      })
      .catch((error: unknown) => {
        setGridLayoutStatus(
          error instanceof Error ? error.message : "No se pudo guardar el mapa de temas.",
        );
      });
  }, [
    activeCourseRoadmap,
    activeDegreeRoadmap,
    clearConceptEditPending,
    conceptCuration,
    focusedCourseSlug,
  ]);

  const handleLayoutEditEnter = useCallback(() => {
    if (layoutEditMode) {
      return;
    }

    setGridLayoutStatus("");
    if (isConceptView) {
      if (conceptCuration) {
        conceptCurationEditBaselineRef.current = cloneCurationSnapshot(conceptCuration);
      }
      setConceptSubgraphEditMode(true);
      setConceptEditTool("select");
      clearConceptEditPending();
    } else {
      courseLayoutEditBaselineRef.current = courseLayoutDocument
        ? (JSON.parse(JSON.stringify(courseLayoutDocument)) as RoadmapCourseLayoutDocument)
        : null;
      setGridLayoutEditMode(true);
    }
  }, [
    clearConceptEditPending,
    conceptCuration,
    courseLayoutDocument,
    isConceptView,
    layoutEditMode,
  ]);

  const handleLayoutEditSave = useCallback(() => {
    if (!layoutEditMode) {
      return;
    }
    if (conceptSubgraphEditMode) {
      handleSaveConceptSubgraph();
    } else {
      handleSaveCourseGrid();
    }
  }, [
    conceptSubgraphEditMode,
    handleSaveConceptSubgraph,
    handleSaveCourseGrid,
    layoutEditMode,
  ]);

  const handleLayoutEditExit = useCallback(() => {
    if (!layoutEditMode) {
      return;
    }

    const unsaved =
      gridLayoutStatus === GRID_LAYOUT_UNSAVED_LABEL ||
      gridLayoutStatus === CONCEPT_LAYOUT_UNSAVED_LABEL;
    if (unsaved && !window.confirm("Hay cambios sin guardar. ¿Querés salir sin guardar?")) {
      return;
    }

    if (conceptSubgraphEditMode) {
      const baseline = conceptCurationEditBaselineRef.current;
      if (baseline) {
        const restored = cloneCurationSnapshot(baseline);
        setConceptCuration(restored);
        conceptCurationHistoryRef.current = createConceptCurationHistory(restored);
        setConceptCurationHistoryTick((tick) => tick + 1);
      }
      conceptCurationEditBaselineRef.current = null;
      setConceptSubgraphEditMode(false);
      clearConceptEditPending();
    } else {
      const baseline = courseLayoutEditBaselineRef.current;
      setCourseLayoutDocument(
        baseline ? (JSON.parse(JSON.stringify(baseline)) as RoadmapCourseLayoutDocument) : null,
      );
      courseLayoutEditBaselineRef.current = null;
      setGridLayoutEditMode(false);
    }

    setGridLayoutStatus("");
  }, [
    clearConceptEditPending,
    conceptSubgraphEditMode,
    gridLayoutStatus,
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
          setSidePendingOwner(null);
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

          const curationOpen = conceptCuration.open();
          const layoutRead = curationOpen.readLinearLayout();
          if (layoutRead.isFailure()) {
            setGridLayoutStatus(conceptEditErrorLabel(layoutRead.error));
            return;
          }

          const attached = layoutRead.attachSide(sidePendingOwner, node.id);
          if (attached.isFailure()) {
            setGridLayoutStatus(conceptEditErrorLabel(attached.error));
            return;
          }

          commitConceptCurationEdit(attached.curation, {
            kind: ConceptCurationEditActionKind.AttachSide,
            ownerTitle: sidePendingOwner,
            branchTitle: node.id,
          });
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        case "spine": {
          if (nodeData.role !== "branch") {
            return;
          }

          const curationOpen = conceptCuration.open();
          const layoutRead = curationOpen.readLinearLayout();
          if (layoutRead.isFailure()) {
            setGridLayoutStatus(conceptEditErrorLabel(layoutRead.error));
            return;
          }

          const promoted = layoutRead.promoteToSpine(node.id);
          if (promoted.isFailure()) {
            setGridLayoutStatus(conceptEditErrorLabel(promoted.error));
            return;
          }

          commitConceptCurationEdit(promoted.curation, {
            kind: ConceptCurationEditActionKind.PromoteToSpine,
            branchTitle: node.id,
          });
          clearConceptEditPending();
          setGridLayoutStatus(CONCEPT_LAYOUT_UNSAVED_LABEL);
          return;
        }
        default:
          return;
      }
    },
    [
      clearConceptEditPending,
      commitConceptCurationEdit,
      sidePendingOwner,
      conceptCuration,
      conceptEditTool,
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

  useLayoutEffect(() => {
    if (!graph || !activeCourseRoadmap) {
      onWorkspaceNavChange?.(null);
      return;
    }

    onWorkspaceNavChange?.({
      degreeSlug: activeCourseRoadmap.degreeSlug,
      courseSlug: focusedCourseSlug,
      scopeAllCarreras: !selectedDegree.trim() && focusedCourseSlug !== null,
    });
  }, [activeCourseRoadmap, focusedCourseSlug, graph, onWorkspaceNavChange, selectedDegree]);

  useEffect(() => {
    return () => onWorkspaceNavChange?.(null);
  }, [onWorkspaceNavChange]);

  if (loadError) {
    return <p className="roadmap__error">{loadError}</p>;
  }

  if (!graph) {
    return <RoadmapLoadingShell canvasPanelRef={canvasPanelRef} />;
  }

  if (!activeCourseRoadmap || !activeDegreeRoadmap) {
    return <p className="roadmap__empty">No hay carreras con materias para mostrar.</p>;
  }

  if (!layout) {
    return <RoadmapLoadingShell canvasPanelRef={canvasPanelRef} />;
  }

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
  return (
    <div className="roadmap">
      {showToolbarSkeleton ? (
        <RoadmapToolbarSkeleton />
      ) : (
      <div className="roadmap__toolbar">
        <div className="roadmap__toolbar-selectors">
          <div className="roadmap__degree-field">
            <span className="roadmap__degree-label">Carrera</span>
            <MetaDropdown
              className="roadmap__toolbar-dropdown"
              ariaLabel="Carrera"
              value={selectedDegree}
              options={degreeSelectOptions}
              onChange={(degree) => {
                if (!degree && focusedCourseSlug === null) {
                  return;
                }

                const panelUrl = readRoadmapPanelUrl();
                setSelectedDegree(degree);

                if (!degree) {
                  if (focusedCourseSlug) {
                    const next: RoadmapPanelUrlState = { course: focusedCourseSlug };
                    if (panelUrl.concept) {
                      next.concept = panelUrl.concept;
                    }
                    syncPanelUrl(next, "push");
                  } else {
                    syncPanelUrl({});
                  }
                  onClosePanels?.();
                  return;
                }

                const roadmap = courseRoadmaps.find((entry) => entry.degree === degree);
                if (!roadmap) {
                  onClosePanels?.();
                  return;
                }

                if (
                  focusedCourseSlug &&
                  roadmap.courses.some((entry) => entry.slug === focusedCourseSlug)
                ) {
                  const next: RoadmapPanelUrlState = {
                    degree: roadmap.degreeSlug,
                    course: focusedCourseSlug,
                  };
                  if (panelUrl.concept) {
                    next.concept = panelUrl.concept;
                  }
                  syncPanelUrl(next, "push");
                  onClosePanels?.();
                  return;
                }

                setFocusedCourseSlug(null);
                syncPanelUrl({ degree: roadmap.degreeSlug }, "push");
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
      )}

      <section
        ref={canvasPanelRef}
        className={`roadmap__canvas-panel${hasConceptGraph ? "" : " roadmap__canvas-panel--empty"}${layoutEditMode ? " roadmap__canvas-panel--grid-edit" : ""}${showCanvasSkeleton ? " roadmap__canvas-panel--booting" : ""}`}
        aria-label={isConceptView ? "Mapa de conceptos de la materia" : "Mapa de materias"}
      >
        {showCanvasSkeleton ? <RoadmapCanvasSkeleton /> : null}
        {canMountFlow ? (
          <div
            className={
              showCanvasSkeleton
                ? "roadmap__canvas-flow roadmap__canvas-flow--preparing"
                : "roadmap__canvas-flow"
            }
          >
            <RoadmapProgressContext.Provider value={progress}>
              <ReactFlow
                defaultViewport={initialViewport ?? undefined}
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
                onViewportReady={handleCanvasViewportReady}
              />
              {yearBandOverlays.length > 0 ? (
                <RoadmapYearBandsLayer overlays={yearBandOverlays} />
              ) : null}
              {isConceptView ? (
                <Panel position="top-left" className="roadmap__graph-back">
                  <button type="button" className="roadmap__back-button" onClick={handleBackToCourses}>
                    ← Volver a carrera
                  </button>
                </Panel>
              ) : null}
              {canEditLayout ? (
                <Panel position="top-right" className="roadmap__grid-layout-panel">
                  {conceptSubgraphEditMode ? (
                    <RoadmapConceptEditToolbar
                      activeTool={conceptEditTool}
                      onToolChange={handleConceptEditToolChange}
                      canMoveUp={canMoveConceptUp}
                      canMoveDown={canMoveConceptDown}
                      onMoveUp={() => applyConceptOrderShift(-1)}
                      onMoveDown={() => applyConceptOrderShift(1)}
                      canUndo={conceptHistoryAvailability.undo}
                      canRedo={conceptHistoryAvailability.redo}
                      onUndo={undoConceptCurationEdit}
                      onRedo={redoConceptCurationEdit}
                      onCopyDebugJson={
                        showConceptCurationDebugExport
                          ? () => void handleCopyConceptCurationDebugJson()
                          : undefined
                      }
                    />
                  ) : null}
                  <div className="roadmap__grid-layout-actions">
                    {layoutEditMode ? (
                      <>
                        <button
                          type="button"
                          className="roadmap__grid-layout-toggle roadmap__grid-layout-exit"
                          onClick={handleLayoutEditExit}
                          aria-label={
                            isConceptView ? "Salir del mapa de temas" : "Salir de la edición de grilla"
                          }
                          title={
                            isConceptView
                              ? "Descartar cambios y salir del mapa de temas"
                              : "Descartar cambios y salir de la grilla"
                          }
                        >
                          Salir
                        </button>
                        <button
                          type="button"
                          className="roadmap__grid-layout-toggle"
                          aria-pressed
                          onClick={handleLayoutEditSave}
                          aria-label={
                            isConceptView ? "Guardar mapa de temas" : "Guardar grilla"
                          }
                          title={isConceptView ? "Guardar mapa de temas" : "Guardar grilla"}
                        >
                          <SvgAssetIcon
                            svg={saveSvg}
                            className="roadmap__grid-layout-toggle-icon"
                            focusable={false}
                          />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="roadmap__grid-layout-toggle"
                        aria-pressed={false}
                        onClick={handleLayoutEditEnter}
                        aria-label={
                          isConceptView
                            ? "Editar mapa de temas"
                            : "Editar posiciones de la grilla"
                        }
                        title={
                          isConceptView ? "Editar mapa de temas" : "Editar posiciones"
                        }
                      >
                        <SvgAssetIcon
                          svg={editSvg}
                          className="roadmap__grid-layout-toggle-icon"
                          focusable={false}
                        />
                      </button>
                    )}
                  </div>
                </Panel>
              ) : null}
              <RoadmapMiniMap />
              <Controls className="roadmap__controls" showInteractive={false} />
              <Background gap={20} size={1} className="roadmap__background" />
              </ReactFlow>
            </RoadmapProgressContext.Provider>
          </div>
        ) : !hasConceptGraph ? (
          <>
            <div className="roadmap__graph-back">
              <button type="button" className="roadmap__back-button" onClick={handleBackToCourses}>
                ← Volver a carrera
              </button>
            </div>
            <p className="roadmap__empty">
              {focusedCourse?.title ?? "Esta materia"} no tiene conceptos vinculados todavía.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
