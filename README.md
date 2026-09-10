# PPS

Curriculum notes and analytics for the PPS zettelkasten, stored as repo-native Markdown.

Source pages live in [`content/pages/`](content/pages/). Shared parsing, diagnostics, and projections live in [`packages/pps-core/`](packages/pps-core/). The CLI in [`pps-analytics/`](pps-analytics/) builds `_generated/` artifacts and Bruin DAC locally. Authors use [`apps/cms/`](apps/cms/) (Vite + inline validation). The public shell is [`apps/site/`](apps/site/) (Astro).

Agent-oriented conventions live in [AGENTS.md](AGENTS.md).

## Setup

From the repository root:

```sh
corepack enable
pnpm install
```

Requirements:

- Node.js 20+
- [pnpm](https://pnpm.io/) (via Corepack)
- [Bruin DAC](https://getbruin.com/docs/dac/) for local dashboards (`dac` on `PATH`)

## Commands

```sh
pnpm typecheck
pnpm test
pnpm build:content
pnpm dev       # single dev server at http://localhost:4321/ (site, analytics, graph, CMS)
pnpm build:pages
pnpm inspect
```

Content directory defaults to `content/pages/` via `pps-analytics/pps.config.ts`. Override with `--content` or `PPS_CONTENT_DIR`.

## Outputs

`pnpm build:content` writes under `pps-analytics/_generated/`:

- `curriculum-graph.json` — full domain graph
- `graph.cy.json` — Cytoscape.js elements for visualization
- `dashboards.json` — static snapshot of all DAC dashboards for the site UI
- `diagnostics.json`
- `summary.md`
- `dac/` — Bruin DAC project (local dev)

## GitHub Pages

`pnpm build:pages` builds the Astro site, CMS bundle, and copies analytics artifacts into a combined `dist/` tree for GitHub Pages (`/`, `/cms/`, `/analytics/`).

Daily cron workflow: `.github/workflows/pages.yml` (optional Supabase pull → build → deploy).

## Supabase sync

```sh
pnpm --filter pps-analytics build
node pps-analytics/dist/src/cli/bin/cli.js sync-pull
node pps-analytics/dist/src/cli/bin/cli.js sync-push
node pps-analytics/dist/src/cli/bin/cli.js sync-status
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_STORAGE_BUCKET`.

## Logseq migration

```sh
npx tsx scripts/migrate-logseq-once.ts <legacy-mirror-pages-dir> content/pages
```
