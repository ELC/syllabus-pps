import cytoscape from "cytoscape";

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

export interface MountGraphOptions {
  cmsBase?: string;
}

function defaultCmsBase(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}${base.endsWith("/") ? "" : "/"}cms/`;
}

function cmsUrlForSlug(cmsBase: string, slug: string): string {
  const url = new URL(cmsBase, window.location.origin);
  url.searchParams.set("page", slug);
  return url.toString();
}

function openInCms(cmsBase: string, slug: string): void {
  window.open(cmsUrlForSlug(cmsBase, slug), "_blank", "noopener,noreferrer");
}

function focusNeighborhood(cy: cytoscape.Core, node: cytoscape.NodeSingular): void {
  const neighborhood = node.closedNeighborhood();

  cy.elements().removeClass("focused filtered-out");
  cy.elements().not(neighborhood).addClass("filtered-out");
  node.addClass("focused");

  cy.fit(neighborhood, 48);
}

function clearNeighborhoodFilter(cy: cytoscape.Core): void {
  cy.elements().removeClass("focused filtered-out");
  cy.fit(undefined, 48);
}

export async function mountGraph(
  containerId: string,
  dataUrl: string,
  options: MountGraphOptions = {},
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing graph container #${containerId}`);
  }

  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load graph (${response.status})`);
  }

  const payload = parseGeneratedPayload<{ elements: cytoscape.ElementsDefinition }>(
    await response.text(),
  );

  const cy = cytoscape({
    container,
    elements: payload.elements,
    layout: { name: "cose", animate: false },
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 10,
          "text-wrap": "wrap",
          "text-max-width": 80,
          width: 40,
          height: 40,
          "background-color": "#4a90d9",
          color: "#111",
          cursor: "pointer",
        },
      },
      {
        selector: "node[kind = 'career']",
        style: { "background-color": "#7b5ea7" },
      },
      {
        selector: "node[kind = 'year']",
        style: { "background-color": "#d97706" },
      },
      {
        selector: "node[kind = 'course']",
        style: { "background-color": "#059669" },
      },
      {
        selector: "node[kind = 'concept']",
        style: { "background-color": "#2563eb", width: 28, height: 28, "font-size": 9 },
      },
      {
        selector: "node.focused",
        style: {
          "border-width": 3,
          "border-color": "#f59e0b",
        },
      },
      {
        selector: ".filtered-out",
        style: {
          display: "none",
        },
      },
      {
        selector: "edge",
        style: {
          label: "data(label)",
          width: 1.5,
          "line-color": "#94a3b8",
          "target-arrow-color": "#94a3b8",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "font-size": 8,
          color: "#475569",
          "text-rotation": "autorotate",
          "text-margin-y": -8,
        },
      },
    ],
  });

  const cmsBase = options.cmsBase ?? defaultCmsBase();
  let tapTimeout: ReturnType<typeof setTimeout> | undefined;

  cy.on("tap", (event) => {
    if (event.target === cy) {
      clearNeighborhoodFilter(cy);
    }
  });

  cy.on("tap", "node", (event) => {
    const node = event.target;
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }
    tapTimeout = setTimeout(() => {
      focusNeighborhood(cy, node);
      tapTimeout = undefined;
    }, 250);
  });

  cy.on("dbltap", "node", (event) => {
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = undefined;
    }

    const slug = event.target.data("slug");
    if (typeof slug !== "string" || !slug) {
      return;
    }
    openInCms(cmsBase, slug);
  });
}
