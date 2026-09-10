/**
 * DAC — Dashboard-as-Code TypeScript Declarations
 *
 * Aligned with bruin-data/dac v0.15.1:
 * https://github.com/bruin-data/dac/releases/tag/v0.15.1
 *
 * Types adapted from:
 * https://github.com/bruin-data/dac/blob/v0.15.1/frontend/src/types/dashboard.ts
 *
 * TSX globals and components follow:
 * https://github.com/bruin-data/dac/blob/v0.15.1/docs/dashboards/tsx.md
 *
 * Import in dashboard files:
 *   import "./dac";
 */

export {};

declare global {
  function include(path: string): string;
  function query(connection: string, sql: string): QueryResult;

  const Dashboard: (props: DashboardProps) => unknown;
  const Row: (props: RowProps) => unknown;
  const Tabs: (props: TabsProps) => unknown;
  const Tab: (props: TabProps) => unknown;
  const Filter: (props: FilterProps) => unknown;
  const Query: (props: QueryProps) => unknown;
  const Metric: (props: MetricProps) => unknown;
  const Chart: (props: ChartProps) => unknown;
  const Table: (props: TableProps) => unknown;
  const Text: (props: TextProps) => unknown;
  const Divider: (props: DividerProps) => unknown;
  const Image: (props: ImageProps) => unknown;

  interface QueryResult {
    columns: Array<{ name: string; type?: string }>;
    rows: unknown[][];
  }

  type ChartType =
    | "line"
    | "bar"
    | "area"
    | "pie"
    | "scatter"
    | "bubble"
    | "combo"
    | "histogram"
    | "boxplot"
    | "funnel"
    | "sankey"
    | "heatmap"
    | "calendar"
    | "sparkline"
    | "waterfall"
    | "xmr"
    | "dumbbell"
    | "gauge"
    | "treemap"
    | "radar"
    | "candlestick"
    | "forest"
    | "vega-lite";

  type FilterType = "date" | "date-range" | "number" | "select" | "text";

  type FormatOperator =
    | "is_empty"
    | "is_not_empty"
    | "text_contains"
    | "text_does_not_contain"
    | "text_starts_with"
    | "text_ends_with"
    | "text_is_exactly"
    | "date_is"
    | "date_before"
    | "date_after"
    | "greater_than"
    | "greater_than_or_equal"
    | "less_than"
    | "less_than_or_equal"
    | "is_equal_to"
    | "is_not_equal_to"
    | "is_between"
    | "is_not_between";

  interface DashboardProps {
    name: string;
    description?: string;
    connection?: string;
    model?: string;
    models?: Record<string, string>;
    children?: unknown;
  }

  interface RowProps {
    height?: number | string;
    children?: unknown;
  }

  interface TabsProps {
    children?: unknown;
  }

  interface TabProps {
    name: string;
    children?: unknown;
  }

  interface FilterOptions {
    values?: string[];
    query?: string;
    connection?: string;
    presets?: string[];
  }

  interface FilterProps {
    name: string;
    description?: string;
    type: FilterType;
    multiple?: boolean;
    default?: unknown;
    options?: FilterOptions;
  }

  interface SemanticDimensionRef {
    name: string;
    granularity?: string;
  }

  interface SemanticQueryFilter {
    dimension?: string;
    operator?:
      | "equals"
      | "not_equals"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "in"
      | "not_in"
      | "between"
      | "is_null"
      | "is_not_null";
    value?: unknown;
    expression?: string;
  }

  interface SemanticSort {
    name: string;
    direction?: "asc" | "desc";
  }

  interface QueryProps {
    name: string;
    sql?: string;
    connection?: string;
    model?: string;
    dimensions?: SemanticDimensionRef[];
    metrics?: string[];
    filters?: SemanticQueryFilter[];
    segments?: string[];
    sort?: SemanticSort[];
    limit?: number;
  }

  interface ValueEncoding {
    field: string;
    type?: "number" | "date" | "category";
    format?: string;
  }

  interface AxisEncoding {
    field: string | string[];
    type?: "number" | "date" | "category";
    title?: string;
    format?: string;
    beginAtZero?: boolean;
    markers?: boolean;
    curve?: "smooth" | "straight" | "stepline";
    dash?: "solid" | "dotted" | "dashed" | "long-dash";
  }

  interface ColorEncoding {
    field: string;
  }

  interface SeriesStyle {
    color?: string;
    curve?: "smooth" | "straight" | "stepline";
    dash?: "solid" | "dotted" | "dashed" | "long-dash";
  }

  interface SliceStyle {
    color?: string;
    label?: string;
  }

  interface RefLine {
    axis: "x" | "y";
    value: number;
    label?: string;
    color?: string;
  }

  interface RefBand {
    axis: "x" | "y";
    from: number;
    to: number;
    label?: string;
    color?: string;
  }

  interface ColorScale {
    backgroundColor: string[];
    range?: number[];
    unit?: "absolute" | "percent" | "percentile";
  }

  interface ColumnRef {
    column: string;
  }

  type RuleValue = number | string | ColumnRef | Array<number | string | ColumnRef>;

  interface FormatLayer {
    if?: FormatOperator;
    value?: RuleValue;
    backgroundColor?: string | string[];
    range?: number[];
    unit?: "absolute" | "percent" | "percentile";
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  }

  interface TableColumn {
    name: string;
    label?: string;
    number?: string;
    like?: string;
    hidden?: boolean;
    align?: "left" | "center" | "right";
    format?: FormatLayer[];
  }

  interface WidgetQueryProps {
    query?: string;
    sql?: string;
    connection?: string;
    model?: string;
  }

  interface SemanticWidgetProps {
    metric?: string;
    dimension?: string;
    granularity?: string;
    dimensions?: SemanticDimensionRef[];
    metrics?: string[];
    filters?: SemanticQueryFilter[];
    segments?: string[];
    sort?: SemanticSort[];
  }

  interface MetricProps extends WidgetQueryProps, SemanticWidgetProps {
    name: string;
    description?: string;
    col?: number;
    value?: ValueEncoding;
  }

  interface ChartProps extends WidgetQueryProps, SemanticWidgetProps {
    name: string;
    description?: string;
    chart: ChartType;
    col?: number;
    spec?: Record<string, unknown>;
    x?: AxisEncoding;
    y?: AxisEncoding;
    y2?: AxisEncoding;
    label?: string;
    value?: ValueEncoding;
    color?: ColorEncoding;
    stacked?: boolean;
    normalized?: boolean;
    horizontal?: boolean;
    size?: string;
    source?: string;
    target?: string;
    bins?: number;
    showValues?: boolean;
    colorScale?: ColorScale;
    lines?: string[];
    series?: Record<string, SeriesStyle>;
    slices?: Record<string, SliceStyle>;
    yMin?: string | Record<string, string>;
    yMax?: string | Record<string, string>;
    refLines?: RefLine[];
    refBands?: RefBand[];
    open?: string;
    high?: string;
    low?: string;
    close?: string;
  }

  interface TableProps extends WidgetQueryProps, SemanticWidgetProps {
    name: string;
    description?: string;
    col?: number;
    columns?: TableColumn[];
  }

  interface TextProps {
    name: string;
    description?: string;
    col?: number;
    content?: string;
  }

  interface DividerProps {
    name: string;
    col?: number;
  }

  interface ImageProps {
    name: string;
    description?: string;
    col?: number;
    src?: string;
    alt?: string;
  }
}
