---
name: create-dashboard
description: >-
  Create and modify Bruin DAC dashboards (TSX), widgets, filters, SQL,
  semantic models, and CLI validate/check/serve workflows. In this repo, edit
  generated dashboards only through pps-analytics/src/dashboards/ and pps-analytics/src/dac/. Use when
  the user mentions DAC, pps-analytics/_generated/dac, dashboard widgets, or dac dashboards.
---

# Create Dashboard

Use this skill to create or modify DAC dashboard projects.

DAC schema, widgets, filters, and semantic examples live in [reference.md](reference.md) (bundled skill v8).

## This repository

PPS dashboards are generated. Do not hand-edit `pps-analytics/_generated/dac/dashboards/*.dashboard.tsx` or other generated files under `pps-analytics/_generated/`.

1. Change dashboard TSX in `pps-analytics/src/dashboards/` and query generators in `pps-analytics/src/dac/generate-queries/`.
2. Rebuild, then validate:

```shell
pnpm typecheck
pnpm test
pnpm build:analytics
dac validate --dir pps-analytics/_generated/dac
dac check --dir pps-analytics/_generated/dac
```

Serve with `dac serve --dir pps-analytics/_generated/dac --open` or `pnpm serve:dac`.

Bruin DAC is not the npm package named `dac`. Install with:

```shell
curl -LsSf https://getbruin.com/install/dac | sh
```

Restart `watch:analytics` after changing compiled analytics code. Bruin DAC needs a Git worktree; run `git init` once from the repo root if needed.

Prefer generated SQL over handwritten dashboard data files. Add short widget descriptions that say what the widget is for and how to read it.

## Authoring workflow

1. Read [reference.md](reference.md) before writing widgets, filters, charts, tables, or semantic models.
2. Keep presentation in dashboard files and query intent in SQL or the semantic layer.
3. Prefer semantic widgets when metrics or dimensions are reused; use direct SQL for one-off queries.
4. Use inline `data` only when there is no connection.
5. After changes, run `dac validate` for structure and `dac check` when queries should execute.
6. Do not put secrets in dashboard files; use `.bruin.yml` connections.

## Project layout

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

- `*.dashboard.tsx` files are dashboards. Author in TSX; this repo does not generate YAML dashboards.
- Other TSX files can be helpers; they are not auto-discovered as dashboards.
- Regular SQL dashboards do not need semantic models.

This repo's generated project is `pps-analytics/_generated/dac`.

## Commands

```shell
dac init my-dashboards
dac validate --dir my-dashboards
dac check --dir my-dashboards
dac serve --dir my-dashboards --open
dac query --dir my-dashboards --dashboard "Sales" --widget "Revenue"
```

## Deprecated fields

Never emit these. If they appear in an existing dashboard, refactor and re-run `dac validate`.

| Deprecated | Replacement |
|---|---|
| Chart `x="col"` / `y={["col"]}` | `x={{ field: "col" }}` / `y={{ field: ["col"] }}` |
| Widget or named-query `file="path.sql"` | Inline `sql`, named `query`, or `include("path.sql")` |
| Metric `column`, `prefix`, `suffix`, `format` | `value={{ field: "<column>", type: "number", format: "<d3-format>" }}` |
| Dashboard inline `semantic` block | `semantic/*.yml` plus `model` |

## Additional resources

- Full DAC authoring spec: [reference.md](reference.md)
