export interface StaticMetric {
  name: string;
  description: string;
  value: number | string;
  format?: ",.0f" | ".1f" | ".2f";
}

export interface StaticFilter {
  name: string;
  description: string;
  defaultValue: string;
  options: string[];
}

export interface StaticColumn {
  name: string;
  label: string;
}

export interface StaticTable {
  name: string;
  description: string;
  columns: StaticColumn[];
  rows: Array<Record<string, string | number>>;
}

export interface StaticDashboard {
  id: string;
  name: string;
  description: string;
  metrics: StaticMetric[];
  filters: StaticFilter[];
  tables: StaticTable[];
}

export interface StaticDashboardExport {
  generatedAt: string;
  dashboards: StaticDashboard[];
}

function parseGeneratedPayload<T>(content: string): T {
  const newlineIndex = content.indexOf("\n");
  const json = newlineIndex === -1 ? content : content.slice(newlineIndex + 1);
  return JSON.parse(json) as T;
}

function formatMetricValue(metric: StaticMetric): string {
  if (typeof metric.value === "string") {
    return metric.value;
  }

  if (metric.format === ",.0f") {
    return metric.value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (metric.format === ".1f") {
    return metric.value.toFixed(1);
  }
  if (metric.format === ".2f") {
    return metric.value.toFixed(2);
  }

  return String(metric.value);
}

function rowMatchesFilters(
  row: Record<string, string | number>,
  filters: Record<string, string>,
): boolean {
  for (const [name, value] of Object.entries(filters)) {
    if (value === "All") {
      continue;
    }
    if (String(row[name] ?? "") !== value) {
      return false;
    }
  }
  return true;
}

function severityClass(value: string): string {
  if (value === "error") {
    return "severity-error";
  }
  if (value === "warning") {
    return "severity-warning";
  }
  return "";
}

function renderMetrics(metrics: StaticMetric[]): HTMLElement {
  const grid = document.createElement("section");
  grid.className = "metrics-grid";

  for (const metric of metrics) {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `
      <h3>${metric.name}</h3>
      <div class="metric-value">${formatMetricValue(metric)}</div>
      <p>${metric.description}</p>
    `;
    grid.appendChild(card);
  }

  return grid;
}

function renderFilters(
  filters: StaticFilter[],
  activeFilters: Record<string, string>,
  onChange: () => void,
): HTMLElement | null {
  if (filters.length === 0) {
    return null;
  }

  const bar = document.createElement("section");
  bar.className = "filters-bar";

  for (const filter of filters) {
    const field = document.createElement("div");
    field.className = "filter-field";

    const label = document.createElement("label");
    label.textContent = filter.name;
    label.title = filter.description;

    const select = document.createElement("select");
    select.value = activeFilters[filter.name] ?? filter.defaultValue;
    for (const optionValue of filter.options) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      activeFilters[filter.name] = select.value;
      onChange();
    });

    field.append(label, select);
    bar.appendChild(field);
  }

  return bar;
}

function renderTable(table: StaticTable, filters: Record<string, string>): HTMLElement {
  const section = document.createElement("section");
  section.className = "dashboard-table-section";

  const header = document.createElement("header");
  header.innerHTML = `<h2>${table.name}</h2><p>${table.description}</p>`;

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const tableEl = document.createElement("table");
  tableEl.className = "dashboard-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of table.columns) {
    const th = document.createElement("th");
    th.textContent = column.label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  const rows = table.rows.filter((row) => rowMatchesFilters(row, filters));
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const column of table.columns) {
      const td = document.createElement("td");
      const value = String(row[column.name] ?? "");
      td.textContent = value;
      if (column.name === "severity") {
        td.className = severityClass(value);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  tableEl.append(thead, tbody);
  wrap.appendChild(tableEl);
  section.append(header, wrap);
  return section;
}

function createInitialFilters(dashboard: StaticDashboard): Record<string, string> {
  return Object.fromEntries(
    dashboard.filters.map((filter) => [filter.name, filter.defaultValue]),
  );
}

function renderDashboardContent(
  root: HTMLElement,
  dashboard: StaticDashboard,
  activeFilters: Record<string, string>,
): void {
  root.replaceChildren();

  const header = document.createElement("header");
  header.className = "dashboard-header";
  header.innerHTML = `<h1>${dashboard.name}</h1><p>${dashboard.description}</p>`;
  root.appendChild(header);
  root.appendChild(renderMetrics(dashboard.metrics));

  const rerenderTables = () => {
    root.querySelectorAll(".dashboard-table-section").forEach((node) => node.remove());
    for (const table of dashboard.tables) {
      root.appendChild(renderTable(table, activeFilters));
    }
  };

  const filtersBar = renderFilters(dashboard.filters, activeFilters, rerenderTables);
  if (filtersBar) {
    root.appendChild(filtersBar);
  }

  rerenderTables();
}

export async function mountAnalyticsDashboard(
  contentId: string,
  tabsId: string,
  dataUrl: string,
): Promise<void> {
  const container = document.getElementById(contentId);
  const tabs = document.getElementById(tabsId);
  if (!container || !tabs) {
    throw new Error(`Missing dashboard containers #${contentId} or #${tabsId}`);
  }

  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load dashboards (${response.status})`);
  }

  const payload = parseGeneratedPayload<StaticDashboardExport>(await response.text());
  if (payload.dashboards.length === 0) {
    container.textContent = "No dashboards found in analytics export.";
    return;
  }

  const filterState = new Map<string, Record<string, string>>();
  let activeDashboard = payload.dashboards[0]!;

  const renderActiveDashboard = () => {
    if (!filterState.has(activeDashboard.id)) {
      filterState.set(activeDashboard.id, createInitialFilters(activeDashboard));
    }
    renderDashboardContent(container, activeDashboard, filterState.get(activeDashboard.id)!);
  };

  const label = document.createElement("div");
  label.className = "dashboard-nav-label";
  label.textContent = "Dashboards";
  tabs.appendChild(label);

  for (const dashboard of payload.dashboards) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = dashboard.name;
    button.classList.toggle("active", dashboard.id === activeDashboard.id);
    button.addEventListener("click", () => {
      activeDashboard = dashboard;
      tabs.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      renderActiveDashboard();
    });
    tabs.appendChild(button);
  }

  renderActiveDashboard();
}
