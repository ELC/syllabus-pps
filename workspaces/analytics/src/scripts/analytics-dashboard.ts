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
    return "analytics__table-severity--error";
  }
  if (value === "warning") {
    return "analytics__table-severity--warning";
  }
  return "";
}

function renderMetrics(metrics: StaticMetric[]): HTMLElement {
  const grid = document.createElement("section");
  grid.className = "analytics__metrics";

  for (const metric of metrics) {
    const card = document.createElement("article");
    card.className = "analytics__metric";

    const name = document.createElement("h3");
    name.className = "analytics__metric-name";
    name.textContent = metric.name;

    const value = document.createElement("div");
    value.className = "analytics__metric-value";
    value.textContent = formatMetricValue(metric);

    const description = document.createElement("p");
    description.className = "analytics__metric-desc";
    description.textContent = metric.description;

    card.append(name, value, description);
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
  bar.className = "analytics__filters";

  for (const filter of filters) {
    const field = document.createElement("div");
    field.className = "analytics__filter";

    const label = document.createElement("label");
    label.className = "analytics__filter-label";
    label.textContent = filter.name;
    label.title = filter.description;

    const select = document.createElement("select");
    select.className = "analytics__filter-select";
    select.value = activeFilters[filter.name] ?? filter.defaultValue;
    for (const optionValue of filter.options) {
      const option = document.createElement("option");
      option.className = "analytics__filter-option";
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
  section.className = "analytics__table";

  const header = document.createElement("header");
  header.className = "analytics__table-head";

  const title = document.createElement("h2");
  title.className = "analytics__table-title";
  title.textContent = table.name;

  const lead = document.createElement("p");
  lead.className = "analytics__table-lead";
  lead.textContent = table.description;

  header.append(title, lead);

  const wrap = document.createElement("div");
  wrap.className = "analytics__table-wrap";

  const tableEl = document.createElement("table");
  tableEl.className = "analytics__table-grid";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of table.columns) {
    const th = document.createElement("th");
    th.className = "analytics__table-cell analytics__table-cell--head";
    th.textContent = column.label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  const rows = table.rows.filter((row) => rowMatchesFilters(row, filters));
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.className = "analytics__table-row";
    for (const column of table.columns) {
      const td = document.createElement("td");
      td.className = `analytics__table-cell ${column.name === "severity" ? severityClass(String(row[column.name] ?? "")) : ""}`.trim();
      td.textContent = String(row[column.name] ?? "");
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
  header.className = "dashboard__header";

  const title = document.createElement("h1");
  title.className = "dashboard__header-title";
  title.textContent = dashboard.name;

  const lead = document.createElement("p");
  lead.className = "dashboard__header-lead";
  lead.textContent = dashboard.description;

  header.append(title, lead);
  root.appendChild(header);
  root.appendChild(renderMetrics(dashboard.metrics));

  const rerenderTables = () => {
    root.querySelectorAll(".analytics__table").forEach((node) => node.remove());
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
  const container = document.querySelector<HTMLElement>(`.${contentId}`);
  const tabs = document.getElementById(tabsId);
  if (!container || !tabs) {
    throw new Error(`Missing dashboard containers .${contentId} or #${tabsId}`);
  }
  container.classList.add("analytics");

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
  label.className = "dashboard__nav-label";
  label.textContent = "Dashboards";
  tabs.appendChild(label);

  for (const dashboard of payload.dashboards) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = dashboard.name;
    button.className = "dashboard__link";
    button.classList.toggle("dashboard__link--active", dashboard.id === activeDashboard.id);
    button.addEventListener("click", () => {
      activeDashboard = dashboard;
      tabs.querySelectorAll("button").forEach((node) => {
        node.className = "dashboard__link";
      });
      button.className = "dashboard__link dashboard__link--active";
      renderActiveDashboard();
    });
    tabs.appendChild(button);
  }

  renderActiveDashboard();
}
