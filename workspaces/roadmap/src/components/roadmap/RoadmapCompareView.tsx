import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { loadAnalyticsArtifact } from "@pps/content/browser";
import { MetaDropdown } from "@pps/shell/MetaDropdown";
import {
  hydrateCurriculumGraph,
  projectAllCourseRoadmaps,
  type CourseRoadmap,
  type CurriculumGraph,
} from "@pps/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getRoadmapCompareUrlSnapshot,
  readRoadmapCompareUrl,
  subscribeRoadmapCompareUrl,
  writeRoadmapCompareUrl,
} from "../../scripts/roadmap-compare-url";
import { RoadmapCanvasSkeleton } from "./RoadmapCanvasSkeleton";
import { RoadmapLoadingShell } from "./RoadmapLoadingShell";
import { buildCompareFlow } from "./build-compare-flow";
import { RoadmapCompareColumnBgNode } from "./RoadmapCompareColumnBgNode";
import { RoadmapCompareCourseNode } from "./RoadmapCompareCourseNode";
import { RoadmapCompareHeaderNode } from "./RoadmapCompareHeaderNode";
import { RoadmapCompareYearBandNode } from "./RoadmapCompareYearBandNode";
import { viewportForRoadmapBounds } from "./roadmap-viewport";

import "@xyflow/react/dist/style.css";

const compareNodeTypes = {
  roadmapCompareHeader: RoadmapCompareHeaderNode,
  roadmapCompareYearBand: RoadmapCompareYearBandNode,
  roadmapCompareCourse: RoadmapCompareCourseNode,
  roadmapCompareColumnBg: RoadmapCompareColumnBgNode,
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

function CompareCanvasViewport({
  viewportKey,
  bounds,
  panelWidth,
  panelHeight,
}: {
  viewportKey: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  panelWidth: number;
  panelHeight: number;
}) {
  const { setViewport } = useReactFlow();
  const appliedForKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    appliedForKeyRef.current = null;
  }, [viewportKey]);

  useLayoutEffect(() => {
    if (panelWidth <= 0 || panelHeight <= 0) {
      return;
    }
    const applyKey = `${viewportKey}:${panelWidth}x${panelHeight}`;
    if (appliedForKeyRef.current === applyKey) {
      return;
    }
    appliedForKeyRef.current = applyKey;
    const viewport = viewportForRoadmapBounds(bounds, panelWidth, panelHeight, 32);
    setViewport(viewport, { duration: 0 });
  }, [bounds, panelHeight, panelWidth, setViewport, viewportKey]);

  return null;
}

function resolveRoadmapBySlug(
  roadmaps: CourseRoadmap[],
  slug: string | undefined,
): CourseRoadmap | null {
  if (!slug) {
    return null;
  }
  return roadmaps.find((entry) => entry.degreeSlug === slug) ?? null;
}

export interface RoadmapCompareViewProps {
  onLoadingChange?: (loading: boolean) => void;
  analyticsArtifactRevision?: string | null;
}

export function RoadmapCompareView({
  onLoadingChange,
  analyticsArtifactRevision,
}: RoadmapCompareViewProps) {
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasPanelSize, setCanvasPanelSize] = useState({ width: 0, height: 0 });
  const compareUrlKey = useSyncExternalStore(
    subscribeRoadmapCompareUrl,
    getRoadmapCompareUrlSnapshot,
    getRoadmapCompareUrlSnapshot,
  );
  const compareUrl = useMemo(() => readRoadmapCompareUrl(), [compareUrlKey]);

  useEffect(() => {
    onLoadingChange?.(true);
    void loadAnalyticsArtifact("curriculum-graph.json")
      .then((loaded) => {
        setGraph(normalizeCurriculumGraph(loaded));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar el plan de estudios.");
      })
      .finally(() => {
        onLoadingChange?.(false);
      });
  }, [analyticsArtifactRevision, onLoadingChange]);

  const courseRoadmaps = useMemo(
    () => (graph ? projectAllCourseRoadmaps(graph) : []),
    [graph],
  );

  const leftSlug = compareUrl.a ?? courseRoadmaps[0]?.degreeSlug ?? "";
  const rightSlug =
    compareUrl.b ??
    courseRoadmaps.find((entry) => entry.degreeSlug !== leftSlug)?.degreeSlug ??
    courseRoadmaps[1]?.degreeSlug ??
    "";

  const leftRoadmap = resolveRoadmapBySlug(courseRoadmaps, leftSlug);
  const rightRoadmap = resolveRoadmapBySlug(courseRoadmaps, rightSlug);

  const leftDegreeOptions = useMemo(
    () =>
      courseRoadmaps.map((roadmap) => ({
        value: roadmap.degreeSlug,
        label: roadmap.degreeDisplayName,
        disabled: roadmap.degreeSlug === rightSlug,
      })),
    [courseRoadmaps, rightSlug],
  );

  const rightDegreeOptions = useMemo(
    () =>
      courseRoadmaps.map((roadmap) => ({
        value: roadmap.degreeSlug,
        label: roadmap.degreeDisplayName,
        disabled: roadmap.degreeSlug === leftSlug,
      })),
    [courseRoadmaps, leftSlug],
  );

  useEffect(() => {
    if (courseRoadmaps.length < 2 || !leftRoadmap || !rightRoadmap) {
      return;
    }
    if (compareUrl.a === leftRoadmap.degreeSlug && compareUrl.b === rightRoadmap.degreeSlug) {
      return;
    }
    writeRoadmapCompareUrl(
      { a: leftRoadmap.degreeSlug, b: rightRoadmap.degreeSlug },
      "replace",
    );
  }, [compareUrl.a, compareUrl.b, courseRoadmaps.length, leftRoadmap, rightRoadmap]);

  const flowLayout = useMemo(() => {
    if (!leftRoadmap || !rightRoadmap) {
      return null;
    }
    return buildCompareFlow(leftRoadmap, rightRoadmap);
  }, [leftRoadmap, rightRoadmap]);

  const viewportKey = `${leftSlug}:${rightSlug}:${flowLayout?.nodes.length ?? 0}`;
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState(flowLayout?.nodes ?? []);

  useEffect(() => {
    setFlowNodes(flowLayout?.nodes ?? []);
  }, [flowLayout, setFlowNodes]);

  useEffect(() => {
    const panel = canvasPanelRef.current;
    if (!panel) {
      return;
    }

    const updateSize = (): void => {
      const width = Math.max(panel.clientWidth, panel.getBoundingClientRect().width);
      const height = Math.max(
        panel.clientHeight,
        panel.offsetHeight,
        panel.getBoundingClientRect().height,
      );
      setCanvasPanelSize({ width, height });
    };

    updateSize();
    const frame = window.requestAnimationFrame(updateSize);
    const observer = new ResizeObserver(updateSize);
    observer.observe(panel);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [flowLayout, leftSlug, rightSlug]);

  const initialViewport = useMemo(() => {
    if (!flowLayout || canvasPanelSize.width <= 0 || canvasPanelSize.height <= 0) {
      return null;
    }
    return viewportForRoadmapBounds(
      flowLayout.bounds,
      canvasPanelSize.width,
      canvasPanelSize.height,
      32,
    );
  }, [canvasPanelSize.height, canvasPanelSize.width, flowLayout]);

  const panelHasSize = canvasPanelSize.width > 0 && canvasPanelSize.height > 0;
  const canMountFlow = Boolean(flowLayout && panelHasSize && initialViewport);
  const showCanvasSkeleton = Boolean(flowLayout && !panelHasSize);

  const handleDegreeChange = useCallback((side: "a" | "b", slug: string) => {
    const current = readRoadmapCompareUrl();
    writeRoadmapCompareUrl(
      {
        a: side === "a" ? slug : current.a ?? leftSlug,
        b: side === "b" ? slug : current.b ?? rightSlug,
      },
      "replace",
    );
  }, [leftSlug, rightSlug]);

  if (loadError) {
    return <p className="roadmap__error">{loadError}</p>;
  }

  if (!graph) {
    return <RoadmapLoadingShell canvasPanelRef={canvasPanelRef} />;
  }

  if (courseRoadmaps.length < 2) {
    return (
      <p className="roadmap__empty">Hace falta al menos dos carreras para comparar.</p>
    );
  }

  if (!leftRoadmap || !rightRoadmap || !flowLayout) {
    return <p className="roadmap__empty">Elegí dos carreras distintas.</p>;
  }

  return (
    <div className="roadmap roadmap--compare">
      <div className="roadmap__toolbar roadmap__toolbar--compare">
        <div className="roadmap__toolbar-selectors">
          <div className="roadmap__degree-field">
            <span className="roadmap__degree-label">Carrera A</span>
            <MetaDropdown
              className="roadmap__toolbar-dropdown"
              ariaLabel="Carrera A"
              value={leftRoadmap.degreeSlug}
              options={leftDegreeOptions}
              onChange={(slug) => {
                if (slug) {
                  handleDegreeChange("a", slug);
                }
              }}
            />
          </div>
          <div className="roadmap__degree-field">
            <span className="roadmap__degree-label">Carrera B</span>
            <MetaDropdown
              className="roadmap__toolbar-dropdown"
              ariaLabel="Carrera B"
              value={rightRoadmap.degreeSlug}
              options={rightDegreeOptions}
              onChange={(slug) => {
                if (slug) {
                  handleDegreeChange("b", slug);
                }
              }}
            />
          </div>
        </div>
      </div>

      <section
        ref={canvasPanelRef}
        className="roadmap__canvas-panel roadmap__canvas-panel--compare"
        aria-label="Comparación de materias entre carreras"
      >
        {showCanvasSkeleton ? (
          <RoadmapCanvasSkeleton className="roadmap__canvas-skeleton--overlay" />
        ) : null}
        {canMountFlow ? (
          <div className="roadmap__canvas-flow">
            <ReactFlow
              defaultViewport={initialViewport ?? undefined}
              nodes={flowNodes}
              edges={[]}
              onNodesChange={onFlowNodesChange}
              nodeTypes={compareNodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll
              minZoom={0.25}
              maxZoom={1.25}
              proOptions={{ hideAttribution: true }}
            >
              <CompareCanvasViewport
                viewportKey={viewportKey}
                bounds={flowLayout.bounds}
                panelWidth={canvasPanelSize.width}
                panelHeight={canvasPanelSize.height}
              />
              <Controls className="roadmap__controls" showInteractive={false} />
              <Background gap={20} size={1} className="roadmap__background" />
            </ReactFlow>
          </div>
        ) : null}
      </section>
    </div>
  );
}
