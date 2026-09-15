import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useStore,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import { projectAllDegreeRoadmaps, type CurriculumGraph } from "@pps/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ConceptPage } from "../../scripts/concept-panel";
import { buildAdjacency } from "./adjacency";
import { buildRoadmapFlow } from "./build-flow";
import {
  EMPTY_ROADMAP_CURATION,
  resolveRoadmapCuration,
  validateRoadmapCuration,
} from "./curation";
import { buildRoadmapLayout, type RoadmapBounds } from "./layout";
import { RoadmapAnchorNode } from "./RoadmapAnchorNode";
import { RoadmapBranchEdge } from "./RoadmapBranchEdge";
import { RoadmapSpineEdge } from "./RoadmapSpineEdge";
import { RoadmapJunctionNode } from "./RoadmapJunctionNode";
import { RoadmapLegend } from "./RoadmapLegend";
import {
  remainingProgressPercent,
  RoadmapProgressContext,
  useRoadmapProgress,
  type RoadmapProgress,
} from "./progress";
import { RoadmapCapstoneNode } from "./RoadmapCapstoneNode";
import { RoadmapTopicNode } from "./RoadmapTopicNode";
import type { CapstoneProject } from "../../scripts/capstone-panel";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = {
  roadmapTopic: RoadmapTopicNode,
  roadmapCapstone: RoadmapCapstoneNode,
  roadmapAnchor: RoadmapAnchorNode,
  roadmapJunction: RoadmapJunctionNode,
};

const edgeTypes: EdgeTypes = {
  roadmapSpine: RoadmapSpineEdge,
  roadmapBranch: RoadmapBranchEdge,
};

const VIEWPORT_PADDING = 48;
/** Below this the labels stop being readable, so wide roadmaps are panned instead of shrunk. */
const MIN_READABLE_ZOOM = 0.55;

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

/**
 * Frames the spine across the width of the canvas and pins it to the top, so the roadmap is read
 * by scrolling down instead of zooming out to the whole graph.
 */
function CanvasViewport({ bounds }: { bounds: RoadmapBounds }) {
  const { setViewport } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  useEffect(() => {
    if (width === 0 || height === 0) {
      return;
    }

    const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const fitted = (width - VIEWPORT_PADDING * 2) / contentWidth;
    const zoom = Math.min(1, Math.max(MIN_READABLE_ZOOM, fitted));
    const centerX = (bounds.minX + bounds.maxX) / 2;

    setViewport({
      x:
        fitted >= MIN_READABLE_ZOOM
          ? width / 2 - centerX * zoom
          : VIEWPORT_PADDING - bounds.minX * zoom,
      y: VIEWPORT_PADDING - bounds.minY * zoom,
      zoom,
    });
  }, [bounds, height, setViewport, width]);

  return null;
}

interface RoadmapAppProps {
  dataUrl: string;
  onConceptOpen?: (page: ConceptPage) => void;
  onCapstoneOpen?: (capstone: CapstoneProject) => void;
  onProgressChange?: (progress: RoadmapProgress) => void;
}

export function RoadmapApp({
  dataUrl,
  onConceptOpen,
  onCapstoneOpen,
  onProgressChange,
}: RoadmapAppProps) {
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [selectedCapstone, setSelectedCapstone] = useState<string>("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    void fetch(dataUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load curriculum graph (${response.status})`);
        }
        const payload = parseGeneratedPayload<CurriculumGraph>(await response.text());
        setGraph(payload);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Failed to load roadmap data.");
      });
  }, [dataUrl]);

  const roadmaps = useMemo(() => (graph ? projectAllDegreeRoadmaps(graph) : []), [graph]);
  const activeRoadmap = useMemo(
    () => roadmaps.find((roadmap) => roadmap.career === selectedCareer) ?? roadmaps[0] ?? null,
    [roadmaps, selectedCareer],
  );

  useEffect(() => {
    if (!selectedCareer && roadmaps[0]) {
      setSelectedCareer(roadmaps[0].career);
    }
  }, [roadmaps, selectedCareer]);

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
    () => (activeRoadmap ? buildAdjacency(activeRoadmap) : null),
    [activeRoadmap],
  );

  const { curation, layout, curationError } = useMemo(() => {
    if (!activeRoadmap || !adjacency) {
      return { curation: null, layout: null, curationError: "" };
    }

    try {
      const resolved = resolveRoadmapCuration(activeRoadmap.careerSlug);
      const activeCuration = resolved ?? EMPTY_ROADMAP_CURATION;

      if (resolved) {
        validateRoadmapCuration(activeRoadmap, resolved);
      }

      return {
        curation: activeCuration,
        layout: buildRoadmapLayout(activeRoadmap, adjacency, activeCuration),
        curationError: "",
      };
    } catch (error: unknown) {
      return {
        curation: null,
        layout: null,
        curationError:
          error instanceof Error ? error.message : "Invalid roadmap curation configuration.",
      };
    }
  }, [activeRoadmap, adjacency]);

  const slugByTitle = useMemo(
    () =>
      new Map((activeRoadmap?.concepts ?? []).map((concept) => [concept.title, concept.slug])),
    [activeRoadmap],
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

  const capstonesById = useMemo(() => {
    const map = new Map<string, CapstoneProject>();
    for (const capstone of curation?.capstones ?? []) {
      map.set(capstone.id, capstone);
    }
    return map;
  }, [curation]);

  const progress = useRoadmapProgress(
    activeRoadmap?.careerSlug ?? "",
    slugByTitle,
    resourceLinesBySlug,
  );

  useEffect(() => {
    onProgressChange?.(progress);
  }, [onProgressChange, progress]);

  const flow = useMemo(
    () =>
      activeRoadmap && adjacency && layout
        ? buildRoadmapFlow({
            roadmap: activeRoadmap,
            adjacency,
            layout,
            focusTitle: selectedConcept || selectedCapstone,
            isTopicDone: (title) => progress.statusFor(title) === "done",
          })
        : { nodes: [], edges: [] },
    [
      activeRoadmap,
      adjacency,
      layout,
      progress.counts,
      progress.statusFor,
      selectedCapstone,
      selectedConcept,
    ],
  );

  useEffect(() => {
    setConfirmingReset(false);
  }, [activeRoadmap]);

  useEffect(() => {
    if (!confirmingReset) {
      return;
    }

    const timer = window.setTimeout(() => setConfirmingReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingReset]);

  const handleConceptOpen = useCallback(
    (title: string) => {
      setSelectedCapstone("");
      setSelectedConcept(title);
      const page = conceptPages.get(title);
      if (page && onConceptOpen) {
        onConceptOpen(page);
      }
    },
    [conceptPages, onConceptOpen],
  );

  const handleCapstoneOpen = useCallback(
    (id: string) => {
      setSelectedConcept("");
      setSelectedCapstone(id);
      const capstone = capstonesById.get(id);
      if (capstone && onCapstoneOpen) {
        onCapstoneOpen(capstone);
      }
    },
    [capstonesById, onCapstoneOpen],
  );

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

  if (curationError) {
    return <p className="roadmap__error">{curationError}</p>;
  }

  if (!graph) {
    return <p className="roadmap__loading">Cargando roadmap…</p>;
  }

  if (!activeRoadmap || !layout) {
    return <p className="roadmap__empty">No hay carreras con conceptos para mostrar.</p>;
  }

  const { counts } = progress;
  const remaining = counts.total - counts.skipped;
  const percent = remainingProgressPercent(counts.done, counts.total, counts.skipped);

  return (
    <div className="roadmap">
      <div className="roadmap__toolbar">
        <label className="roadmap__degree-field">
          <span className="roadmap__degree-label">Carrera</span>
          <select
            className="roadmap__degree-select"
            value={activeRoadmap.career}
            onChange={(event) => {
              setSelectedCareer(event.target.value);
              setSelectedConcept("");
              setSelectedCapstone("");
            }}
          >
            {roadmaps.map((roadmap) => (
              <option key={roadmap.career} value={roadmap.career}>
                {roadmap.career}
              </option>
            ))}
          </select>
        </label>

        <div className="roadmap__progress">
          <div className="roadmap__progress-head">
            <span className="roadmap__degree-label">Progreso</span>
            <span className="roadmap__progress-value">
              {counts.done} de {remaining} temas · {percent}%
            </span>
          </div>

          <div
            className="roadmap__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={remaining}
            aria-valuenow={counts.done}
            aria-label={`Temas completados en ${activeRoadmap.career}`}
          >
            <span className="roadmap__progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="roadmap__progress-foot">
            <span className="roadmap__progress-meta">{counts.skipped} omitidos</span>
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

      <p className="roadmap__toolbar-help">
        Tres caminos arrancan en paralelo desde el inicio, se unen en un solo eje y bajan hasta el
        objetivo; los temas laterales cuelgan una sola vez de un nodo del eje. Elegí una tarjeta
        para ver sus recursos y marcarlos como hechos u omitidos. Los hexágonos son proyectos
        integradores con la consigna de qué construir.
      </p>

      <RoadmapLegend />

      <section className="roadmap__canvas-panel" aria-label="Mapa de conceptos">
        <RoadmapProgressContext.Provider value={progress}>
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.2}
            maxZoom={1.5}
            onNodeClick={(_, node) => {
              if (node.type === "roadmapTopic") {
                handleConceptOpen(node.id);
                return;
              }

              if (node.type === "roadmapCapstone") {
                handleCapstoneOpen(node.id);
              }
            }}
            proOptions={{ hideAttribution: true }}
          >
            <CanvasViewport bounds={layout.bounds} />
            <MiniMap pannable zoomable className="roadmap__minimap" nodeStrokeWidth={0} />
            <Controls className="roadmap__controls" showInteractive={false} />
            <Background gap={20} size={1} className="roadmap__background" />
          </ReactFlow>
        </RoadmapProgressContext.Provider>
      </section>
    </div>
  );
}
