import { match } from "ts-pattern";

export const metricFormats = [",.0f", ".1f", ".2f"] as const;

export type MetricFormat = (typeof metricFormats)[number];

export const metricFormat = {
  integer: ",.0f",
  oneDecimal: ".1f",
  twoDecimals: ".2f",
} as const satisfies Record<string, MetricFormat>;

export const staticFilterAllValue = "All" as const;

export type StaticFilterAllValue = typeof staticFilterAllValue;

export interface StaticMetric {
  name: string;
  description: string;
  value: number | string;
  format?: MetricFormat;
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

export const staticTableColumns = {
  severity: "severity",
} as const;

export type StaticTableColumn = (typeof staticTableColumns)[keyof typeof staticTableColumns];

export function rowMatchesStaticFilters(
  row: Record<string, string | number>,
  filters: Record<string, string>,
): boolean {
  return Object.entries(filters).every(([name, value]) =>
    match(value)
      .with(staticFilterAllValue, () => true)
      .otherwise((filterValue) => String(row[name] ?? "") === filterValue),
  );
}

export function formatStaticMetricValue(metric: StaticMetric): string {
  return match(metric)
    .when(
      (entry): entry is StaticMetric & { value: number } => typeof entry.value === "number",
      (entry) =>
        match(entry.format)
          .with(metricFormat.integer, () =>
            entry.value.toLocaleString("en-US", { maximumFractionDigits: 0 }),
          )
          .with(metricFormat.oneDecimal, () => entry.value.toFixed(1))
          .with(metricFormat.twoDecimals, () => entry.value.toFixed(2))
          .otherwise(() => String(entry.value)),
    )
    .otherwise((entry) => String(entry.value));
}
