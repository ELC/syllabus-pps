# Create Dashboard

Use this skill to create or modify DAC dashboard projects.

DAC projects define dashboards as TypeScript (`.dashboard.tsx`) and run queries through Bruin connections. Dashboards can use direct SQL or the semantic layer. Semantic widgets reference models, dimensions, metrics, and segments; DAC compiles them to SQL in the backend.

Author dashboards in TSX. DAC also accepts `*.yml` / `*.yaml` dashboards with the same schema, but this repository generates TSX only — do not add YAML dashboard files.

## Project Layout

```text
my-dac-project/
  .bruin.yml
  dashboards/
    sales.dashboard.tsx
    queries/
      revenue.sql
  semantic/
    sales.yml
  themes/
    brand.yml
```

Use `dashboards/` for `*.dashboard.tsx` files and `semantic/` for semantic model YAML files. Regular SQL dashboards do not need semantic models.

Dashboard files:

- `*.dashboard.tsx` files are dashboards.
- Other TSX files can be helpers, but are not auto-discovered as dashboards.

Import DAC globals at the top of each dashboard:

```tsx
import "./dac";
```

## Commands

```shell
dac init my-dashboards
dac validate --dir my-dashboards
dac check --dir my-dashboards
dac serve --dir my-dashboards --open
dac query --dir my-dashboards --dashboard "Sales" --widget "Revenue"
```

Use `dac validate` after editing structure and `dac check` when query execution should be verified.

## Connection Config

DAC reads Bruin connections from `.bruin.yml`.

```yaml
default_environment: default

environments:
  default:
    connections:
      duckdb:
        - name: local_duckdb
          path: data/analytics.duckdb
          read_only: true
```

Prefer `read_only: true` for DuckDB dashboards unless the project explicitly needs writes.

## TSX Dashboard

```tsx
import "./dac";

export default (
  <Dashboard
    name="Sales"
    description="Revenue and customer activity"
    connection="local_duckdb"
  >
    <Filter
      name="region"
      type="select"
      default="All"
      options={{ values: ["All", "North America", "Europe", "APAC"] }}
    />
    <Filter name="date_range" type="date-range" default="last_30_days" />

    <Row>
      <Metric
        name="Revenue"
        sql={`
          SELECT SUM(amount) AS value
          FROM sales
          WHERE created_at >= '{{ filters.date_range.start }}'
            AND created_at <= '{{ filters.date_range.end }}'
          {% if filters.region != 'All' %}
            AND region = '{{ filters.region }}'
          {% endif %}
        `}
        value={{ field: "value", type: "number", format: "$,.2f" }}
        col={3}
      />
    </Row>
  </Dashboard>
);
```

Prefer `sql={include("queries/revenue.sql")}` when the query lives in a `.sql` file. `include` inlines the file at load time.

Widget components are `Metric`, `Chart`, `Table`, `Text`, `Divider`, and `Image`.

A `Table` column takes `name`, `label`, `number` (value format: `number`, `currency`, or a d3-format string), `align` (`left`/`center`/`right` — overrides the type-inferred alignment of the header and body cells, e.g. to right-align a text value like `£177K`), `like`, `hidden`, and `format`. `format` is an **ordered list of layers**; for each cell the **first layer that matches wins**. A scalar `format` string (e.g. `format: "currency"`) is also accepted as a legacy alias for `number` — prefer `number` in new dashboards.

- With `if` (+ `value`), the layer styles only the cells that match. `value` is a scalar, `[low, high]` for `is_between`/`is_not_between`, `{ column: "<name>" }` to compare against another column in the same row, or omitted for empty checks. Operators: `is_empty`, `is_not_empty`, `text_contains`/`text_does_not_contain`/`text_starts_with`/`text_ends_with`/`text_is_exactly`, `date_is`/`date_before`/`date_after` (by day, or exact instant with a time), `greater_than`/`greater_than_or_equal`/`less_than`/`less_than_or_equal`, `is_equal_to`/`is_not_equal_to`, `is_between`/`is_not_between`.
- With no `if`, the layer styles every cell — a **gradient** (`backgroundColor` is a list of 2+ colors; optional `range` list + `unit` = `absolute`/`percent`/`percentile`, omit `range` for auto min/max) or a **flat fill** (`backgroundColor` is a string). Put it last as the fallback.
- Styles on any layer: `backgroundColor`, `textColor`, `bold`, `italic`, `underline`, `strikethrough`.
- `like`: mirror another column's coloring, driven by that column's per-row value, while keeping this column's own `number`.
- `hidden: true`: keep the column in the result but don't render it. Optional. Coloring reads a column whether or not it's shown, so hide only to drop it from the display, e.g. a `like` source you must declare but don't want visible.

Each layer is a TS object, e.g. `{ backgroundColor: ["red", "white", "green"], range: [-25, 0, 25], unit: "absolute" }`.

Colors are **named** (`red green blue indigo cyan purple pink amber`, plus `white`/`black`, aliases `positive`/`negative`/`warning`) or hex. Named colors adapt to light and dark.

Worked example:

```tsx
export default (
  <Dashboard name="Regions">
    <Row>
      <Table
        name="Regions"
        col={12}
        sql="SELECT revenue, growth, score, status, actual, target, bonus, health FROM regions"
        columns={[
          {
            name: "revenue",
            number: "currency",
            format: [
              { backgroundColor: ["red", "white", "green"] }, // gradient, auto min→max
            ],
          },
          {
            name: "growth",
            number: "number",
            format: [
              {
                backgroundColor: ["blue", "white", "amber"],
                range: [-25, 0, 25],
                unit: "absolute",
              }, // fixed anchors; unit also percent/percentile
            ],
          },
          {
            name: "score",
            number: "number",
            format: [ // conditions, first match wins
              { if: "greater_than_or_equal", value: 80, backgroundColor: "green" },
              { if: "is_between", value: [50, 79], backgroundColor: "amber" },
              { if: "less_than", value: 50, textColor: "red", strikethrough: true },
            ],
          },
          {
            name: "status",
            format: [
              { if: "text_contains", value: "urgent", backgroundColor: "amber", bold: true },
              { if: "is_empty", backgroundColor: "#F3F4F6", italic: true }, // flat fill (string)
            ],
          },
          {
            name: "actual",
            number: "number",
            format: [ // cross-column, same row
              { if: "greater_than", value: { column: "target" }, backgroundColor: "green" },
            ],
          },
          {
            name: "target",
            hidden: true, // in the result for the rule above, not rendered
          },
          {
            name: "bonus",
            number: "currency",
            like: "score", // mirror score's colors, keep own number
          },
          {
            name: "health",
            number: "number",
            format: [ // a condition wins over the gradient base below
              { if: "is_equal_to", value: 0, backgroundColor: "red", bold: true },
              { backgroundColor: ["red", "white", "green"] }, // base, last (always matches)
            ],
          },
        ]}
      />
    </Row>
  </Dashboard>
);
```

## Filters

Dashboard filters are UI controls. SQL dashboards use filter values through Jinja templates.

Supported filter types:

- `select`
- `date-range`
- `date`
- `number`
- `text`

Date range presets include `today`, `yesterday`, `last_7_days`, `last_30_days`, `last_90_days`, `this_month`, `last_month`, `this_quarter`, `this_year`, `year_to_date`, and `all_time`.

Both single and multiple `select` filters show a searchable dropdown, so you can type to find an option quickly when the list is long.

Select filters support `multiple` for multi-select. The value is a list — render with `join` in Jinja and guard the empty case:

```sql
{% if filters.status and filters.status | length > 0 %}
  AND status IN ('{{ filters.status | join("','") }}')
{% endif %}
```

```tsx
<Filter
  name="status"
  type="select"
  multiple
  options={{ values: ["open", "closed", "pending"] }}
/>
```

Filter values are kept in the URL query string, so you can share a filtered dashboard as a link. Each filter becomes one query parameter named after it, for example `?region=Europe&date_range=last_30_days`. When a select has `multiple` the values are comma separated, and a `date-range` is either a preset key or `start..end`. Anything read from the URL is checked against the filter's type and options, and ignored if it doesn't match.

## Current Viewer (`bruin.user_email`)

`{{ bruin.user_email }}` is the email of the signed-in user viewing the dashboard — a Bruin Cloud runtime feature that resolves per viewer, so one dashboard can show each person only their own rows:

```sql
SELECT * FROM orders WHERE owner_email = '{{ bruin.user_email }}'
```

Locally there is no signed-in user, so the value comes from the `BRUIN_USER_EMAIL` environment variable (empty if unset). To preview a user-scoped dashboard as a specific person, pass it inline: `BRUIN_USER_EMAIL=someone@example.com dac dev`. In Bruin Cloud this becomes dynamic per signed-in viewer.

## Named Queries

Use `<Query>` when multiple widgets share the same SQL or semantic query.

```tsx
export default (
  <Dashboard name="Sales" connection="local_duckdb">
    <Query
      name="revenue_by_region"
      sql={`
        SELECT region, SUM(amount) AS revenue
        FROM sales
        GROUP BY 1
      `}
    />

    <Row>
      <Chart
        name="Revenue by Region"
        chart="bar"
        query="revenue_by_region"
        x={{ field: "region" }}
        y={{ field: ["revenue"] }}
        col={6}
      />
    </Row>
  </Dashboard>
);
```

A chart's `x` and `y` are axis encoding objects with a required `field` (bare column names like `x="region"` are invalid). `field` may be a single column or a list. On line/area (and combo), `y` also takes `beginAtZero` (anchor the value axis at 0), `markers={false}` (hide point dots), `curve` (`smooth`/`straight`/`stepline` — chart-wide interpolation; use `straight` for period totals), and `dash` (chart-wide dash pattern every series inherits: `dotted`/`dashed`/`long-dash`; omit for solid). Per-series style overrides go in a **widget-level `series`** map (a sibling of `x`/`y`, not inside `y`), keyed by y-column: `series={{ revenue: { color: "#EC4899", curve: "straight", dash: "dashed" } }}` — each key falls back to the chart-wide default / palette; store only genuine differences. Label/value charts (`pie`/`treemap`/`funnel`) style per **slice** instead, via a sibling **`slices`** map keyed by the slice's data label: `slices={{ Enterprise: { color: "#8B5CF6", label: "Enterprise (2026)" } }}` — `color` overrides the palette, `label` renames the displayed slice; both optional.

Add a second (right-hand) value axis with `y2` when two series live on different scales (e.g. revenue `$` and conversion `%`) and one would otherwise be squashed flat. A y-column plots against the right axis when it is listed in `y2.field`; all other series stay on the left `y` axis. `y2` is a full axis encoding (same `title`/`format`/`beginAtZero`/`curve`/`dash` keys as `y`) and each axis formats its ticks and tooltip values independently. Supported on `line`/`area`/`bar`/`combo`; a column belongs to exactly one axis, `y2.type` must be `"number"`, and `y2` cannot combine with `stacked`, `horizontal` bars, or `color`. Axis (`y` vs `y2`) and shape (bar vs line via `lines`) are independent — the classic combo is revenue bars on the left with a rate line on the right:

```tsx
<Chart
  name="Revenue vs conversion"
  chart="combo"
  lines={["conversion_rate"]}
  y={{ field: ["revenue"], format: "$,.0f" }}
  y2={{ field: ["conversion_rate"], format: ".1%" }}
/>
```

The `funnel` chart shows conversion through ordered stages: one bar per stage with its share of the top of the funnel and the step-to-step conversion. Use `label` (stage) and `value` (count), and order rows top-of-funnel first in SQL. `horizontal` lays the stages left-to-right, and bar labels honor `value.format` (e.g. `"$,.0f"` for a revenue funnel).

Confidence intervals use `yMin`/`yMax` (the lower/upper bound columns): on `line`/`area` they shade a CI **band** behind the estimate line; on `bar` they become **error-bar caps**; the `forest` chart draws a point estimate + horizontal CI per category (grey when the interval spans 0, `horizontal={false}` for a vertical dot-and-whisker). `y` is the estimate only. `yMin`/`yMax` are a single column, or a per-series map `{ seriesColumn: boundColumn }` for multi-line bands. Compute the bounds in SQL (e.g. `effect ± 1.96*stderr`). Reference guides: `refLines={[{ axis: "x" | "y", value, label? }]}` (dashed line, e.g. a 0 "no-effect" mark) and `refBands={[{ axis: "x" | "y", from, to, label? }]}` (a shaded range, e.g. a ±MDE band).

### Vega-Lite charts

Use `chart="vega-lite"` with a `spec` object for advanced layered, faceted, concatenated, or transformed visualizations. DAC still owns the query and injects its result as the named `dac` dataset:

```tsx
<Chart
  name="Revenue with confidence interval"
  chart="vega-lite"
  sql="SELECT month, revenue, lower_ci, upper_ci FROM monthly_revenue ORDER BY month"
  spec={{
    data: { name: "dac" },
    encoding: {
      x: { field: "month", type: "temporal" },
    },
    layer: [
      {
        mark: { type: "area", opacity: 0.14 },
        encoding: {
          y: { field: "lower_ci", type: "quantitative" },
          y2: { field: "upper_ci" },
        },
      },
      {
        mark: { type: "line", strokeWidth: 2 },
        encoding: {
          y: { field: "revenue", type: "quantitative" },
        },
      },
    ],
  }}
/>
```

`spec.data` is optional and defaults to `{ name: "dac" }`. If provided, it must use that name. Do not use `data.url` or define `datasets.dac`; load primary data through `sql`, `query`, semantic fields, or the widget's illustrative inline `data`. DAC supplies theme and responsive-size defaults, while explicit Vega-Lite `config`, `width`, `height`, and `autosize` values override them.

Every query is an inline `sql` prop, `sql={include("queries/revenue.sql")}`, or a named `query` reference. Do not use a `file` path prop.

## Inline (Static) Data

A `Metric`, `Chart`, or `Table` widget can carry its values inline with `data` instead of a query. A widget with `data` renders **without a connection or SQL** — `columns` are the column names and `rows` is one positional list per row. The encoding fields (`x`, `y`, `value`, `label`, `columns`) reference the column names.

```tsx
<Row>
  <Chart
    name="Revenue by Quarter"
    chart="bar"
    col={6}
    data={{
      columns: ["quarter", "revenue"],
      rows: [
        ["Q1", 12000],
        ["Q2", 15500],
        ["Q3", 14200],
        ["Q4", 18900],
      ],
    }}
    x={{ field: "quarter", type: "category" }}
    y={{ field: ["revenue"], type: "number", format: "$,.0f" }}
  />
</Row>
```

**Use this only when there is genuinely no data connection** — e.g. a brand-new project where `.bruin.yml` has no connections, a hardcoded illustrative example, or a layout mockup. **When a connection exists, always use `sql`, `query`, or a semantic widget instead.** Inline data is frozen: it never refreshes, ignores filters, and goes stale. Do not paste real query results into `data` to "cache" them, and do not present made-up numbers as real — tell the user inline values are illustrative until a warehouse is connected.

Rules:

- `data` is mutually exclusive with `sql`, `query`, and semantic fields (`model`, `dimension`, `metrics`, …). Setting both fails validation.
- Every row must have exactly one value per column.
- Not valid on `Text`, `Image`, or `Divider` widgets.
- A dashboard built entirely from `data` widgets needs no top-level `connection`.

## Semantic Models

Semantic models live in `semantic/*.yml`.

```yaml
name: sales
label: Sales
source:
  table: marts.sales

dimensions:
  - name: created_at
    type: time
    granularities:
      month: date_trunc('month', created_at)
  - name: region
    type: string
  - name: channel
    type: string

metrics:
  - name: revenue
    expression: sum(amount)
    format:
      type: currency
      currency: USD
      decimals: 0
  - name: orders
    expression: count(*)
  - name: average_order_value
    expression: "{revenue} / nullif({orders}, 0)"

segments:
  - name: online
    filter: "channel = 'online'"
```

Metrics are aggregate SQL expressions or expressions over other metrics using `{metric_name}` references. Dimensions are the only fields valid for semantic filters.

### Joins

A model can join to other models so a query can group, filter, or sort by dimensions on a related model. Declare a `joins` block on the model and a `primary_key` on the join target, then reference joined dimensions as `relation.dimension`.

```yaml
# semantic/orders.yml
name: orders
source:
  table: marts.orders
primary_key: order_id
joins:
  - name: customers          # relation name; also the target model name unless `model:` is set
    relationship: many_to_one
    foreign_key: customer_id # column on this model pointing at customers.primary_key
dimensions:
  - name: category
    type: string
metrics:
  - name: revenue
    expression: sum(amount)
```

```yaml
# semantic/customers.yml
name: customers
source:
  table: marts.customers
primary_key: customer_id
dimensions:
  - name: country
    type: string
```

A widget or named query on `orders` then references the joined dimension by `relation.dimension`:

```tsx
<Chart
  name="Revenue by Country"
  chart="bar"
  dimension="customers.country"
  metrics={["revenue"]}
/>
```

Relationships: `one_to_one`, `many_to_one`, `one_to_many`, `many_to_many`. Use `target_key` to override the joined column, or `sql` for a custom join condition.

## Semantic Dashboard

```tsx
export default (
  <Dashboard name="Semantic Sales" connection="local_duckdb" model="sales">
    <Filter
      name="region"
      type="select"
      default="North America"
      options={{ values: ["North America", "Europe", "APAC"] }}
    />

    <Row>
      <Metric
        name="Revenue"
        metric="revenue"
        filters={[
          { dimension: "region", operator: "equals", value: "{{ filters.region }}" },
        ]}
        value={{ field: "revenue", type: "number", format: "$,.0f" }}
        col={3}
      />
      <Chart
        name="Revenue by Month"
        chart="area"
        dimension="created_at"
        granularity="month"
        metrics={["revenue"]}
        sort={[{ name: "created_at", direction: "asc" }]}
        col={9}
      />
    </Row>
  </Dashboard>
);
```

A widget can set `model` directly, or inherit the dashboard-level `model`. For multiple models, use a dashboard-level `models` map and reference the model alias on widgets or named queries.

Keep semantic logic declarative; do not manually compile semantic metrics to SQL in TSX.

Semantic filter operators include `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`, `is_null`, and `is_not_null`.

## Deprecated Fields

These fields were removed from the DAC schema. Never emit them in new dashboards. **If you encounter any of them while reading or editing an existing dashboard, refactor them to the current form** — preserving the original column, formatting, and labels — and re-run `dac validate` to confirm the dashboard still loads.

| Deprecated | Replacement |
|---|---|
| Chart `x="col"` / `y={["col"]}` (bare column names) | `x={{ field: "col" }}` / `y={{ field: ["col"] }}` — axis encoding objects with a required `field` |
| Widget or named-query `file="path.sql"` | Inline `sql`, `sql={include("path.sql")}`, or a named `query` reference |
| Metric widget `column`, `prefix`, `suffix`, `format` (flat fields) | `value={{ field: "<column>", type: "number", format: "<d3-format>" }}` |
| Dashboard inline `semantic` block (`source` / `metrics` / `dimensions`) | Define the model in `semantic/*.yml` and reference it with `model` |

## Authoring Rules

- Keep dashboard files focused on presentation and query intent.
- Prefer semantic widgets when metrics or dimensions are reused.
- Use direct SQL for one-off custom queries or non-semantic dashboards.
- Use inline `data` only when there is no connection; prefer `sql`/`query`/semantic whenever one exists, since inline data never refreshes.
- Validate TSX dashboards after changes.
- Do not require semantic models for regular SQL dashboards.
- Do not put secrets in dashboard files; use Bruin connection config.
- Do not author YAML dashboards in this repository.
