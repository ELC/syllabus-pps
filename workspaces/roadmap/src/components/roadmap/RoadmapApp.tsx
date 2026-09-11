import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { projectAllDegreeRoadmaps, type CurriculumGraph, type DegreeRoadmap } from "@pps/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { capitalizeWords } from "../../scripts/labels";
import type { ConceptPage } from "../../scripts/concept-panel";
import { RoadmapAnchorNode } from "./RoadmapAnchorNode";
import { buildRoadmapFlow } from "./build-flow";
import { ROADMAP_END_ID, ROADMAP_START_ID } from "./constants";
import { layoutRoadmapElements } from "./layout-elk";
import { RoadmapTopicNode } from "./RoadmapTopicNode";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = {
  roadmapTopic: RoadmapTopicNode,
  roadmapAnchor: RoadmapAnchorNode,
};

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

function topologicalLayers(roadmap: DegreeRoadmap): string[][] {
  const titles = roadmap.concepts.map((concept) => concept.title);
  const incoming = new Map(titles.map((title) => [title, 0]));
  const adjacency = new Map<string, string[]>();

  for (const concept of roadmap.concepts) {
    adjacency.set(concept.title, []);
    for (const prerequisite of concept.dependsOn) {
      if (!incoming.has(prerequisite)) {
        continue;
      }
      incoming.set(concept.title, (incoming.get(concept.title) ?? 0) + 1);
      adjacency.set(prerequisite, [...(adjacency.get(prerequisite) ?? []), concept.title]);
    }
  }

  const layers: string[][] = [];
  let frontier = titles.filter((title) => (incoming.get(title) ?? 0) === 0);

  while (frontier.length > 0) {
    layers.push([...frontier].sort((left, right) => left.localeCompare(right, "es-AR")));
    const nextFrontier: string[] = [];

    for (const title of frontier) {
      for (const dependent of adjacency.get(title) ?? []) {
        incoming.set(dependent, (incoming.get(dependent) ?? 0) - 1);
        if ((incoming.get(dependent) ?? 0) === 0) {
          nextFrontier.push(dependent);
        }
      }
    }

    frontier = nextFrontier;
  }

  return layers;
}

interface RoadmapAppProps {
  dataUrl: string;
  onConceptOpen?: (page: ConceptPage) => void;
}

export function RoadmapApp({ dataUrl, onConceptOpen }: RoadmapAppProps) {
  const [graph, setGraph] = useState<CurriculumGraph | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
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
            })),
          },
        ]),
    );
  }, [graph]);

  const outlineLayers = useMemo(
    () => (activeRoadmap ? topologicalLayers(activeRoadmap) : []),
    [activeRoadmap],
  );

  const applyLayout = useCallback(async (roadmap: DegreeRoadmap, focusTitle: string) => {
    const { nodes: flowNodes, edges: flowEdges } = buildRoadmapFlow(roadmap, focusTitle);
    const layoutedNodes = await layoutRoadmapElements(flowNodes, flowEdges);
    setNodes(layoutedNodes);
    setEdges(flowEdges);
  }, []);

  useEffect(() => {
    if (!activeRoadmap) {
      setNodes([]);
      setEdges([]);
      return;
    }

    void applyLayout(activeRoadmap, selectedConcept);
  }, [activeRoadmap, applyLayout, selectedConcept]);

  const handleConceptSelect = useCallback(
    (title: string) => {
      setSelectedConcept(title);
      const page = conceptPages.get(title);
      if (page && onConceptOpen) {
        onConceptOpen(page);
      }
    },
    [conceptPages, onConceptOpen],
  );

  if (loadError) {
    return <p className="roadmap-error">{loadError}</p>;
  }

  if (!graph) {
    return <p className="roadmap-loading">Cargando roadmap…</p>;
  }

  if (!activeRoadmap) {
    return <p className="roadmap-empty">No hay carreras con conceptos para mostrar.</p>;
  }

  return (
    <div className="roadmap-app">
      <div className="roadmap-toolbar">
        <label className="roadmap-degree-field">
          <span className="roadmap-degree-label">Carrera</span>
          <select
            className="roadmap-degree-select"
            value={activeRoadmap.career}
            onChange={(event) => {
              setSelectedCareer(event.target.value);
              setSelectedConcept("");
            }}
          >
            {roadmaps.map((roadmap) => (
              <option key={roadmap.career} value={roadmap.career}>
                {roadmap.career}
              </option>
            ))}
          </select>
        </label>
        <p className="roadmap-toolbar-help">
          El mapa fluye de arriba hacia abajo desde un inicio común hasta un objetivo común. Cada
          tarjeta es un concepto; elegí una para ver sus notas y resaltar prerequisitos y siguientes
          pasos.
        </p>
      </div>

      <div className="roadmap-body">
        <aside className="roadmap-outline" aria-label="Outline de conceptos">
          <h2 className="roadmap-outline-title">Ruta sugerida</h2>
          <ol className="roadmap-outline-list">
            <li className="roadmap-outline-layer">
              <span className="roadmap-outline-layer-label">Inicio</span>
              <p className="roadmap-outline-anchor-copy">
                Punto de partida compartido para todos los caminos del roadmap.
              </p>
            </li>
            {outlineLayers.map((layer, layerIndex) => (
              <li key={`layer-${layerIndex}`} className="roadmap-outline-layer">
                <span className="roadmap-outline-layer-label">Etapa {layerIndex + 1}</span>
                <ul>
                  {layer.map((title) => {
                    const concept = activeRoadmap.concepts.find((item) => item.title === title);
                    const prereqText =
                      concept && concept.dependsOn.length > 0
                        ? `Requiere: ${concept.dependsOn.join(", ")}`
                        : "Sin prerequisitos";

                    return (
                      <li key={title}>
                        <button
                          type="button"
                          className={`roadmap-outline-button${
                            selectedConcept === title ? " is-active" : ""
                          }`}
                          onClick={() => handleConceptSelect(title)}
                        >
                          <span className="roadmap-outline-button-title">
                            {capitalizeWords(title)}
                          </span>
                          <span className="roadmap-outline-button-meta">{prereqText}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            <li className="roadmap-outline-layer">
              <span className="roadmap-outline-layer-label">Objetivo</span>
              <p className="roadmap-outline-anchor-copy">
                Meta común al completar los conceptos terminales del roadmap.
              </p>
            </li>
          </ol>
        </aside>

        <section className="roadmap-canvas-panel" aria-label="Mapa de conceptos">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            onNodeClick={(_, node) => {
              if (node.id === ROADMAP_START_ID || node.id === ROADMAP_END_ID) {
                return;
              }
              handleConceptSelect(node.id);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap pannable zoomable className="roadmap-minimap" />
            <Controls className="roadmap-controls" showInteractive={false} />
            <Background gap={18} size={1} className="roadmap-background" />
          </ReactFlow>
        </section>
      </div>
    </div>
  );
}
