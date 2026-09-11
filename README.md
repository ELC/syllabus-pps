# PPS

Curriculum notes and analytics for the PPS zettelkasten, stored as repo-native Markdown.

Source pages live in [`content/pages/`](content/pages/). Shared parsing, diagnostics, and projections live in [`workspaces/core/`](workspaces/core/). The CLI in [`workspaces/analytics-cli/`](workspaces/analytics-cli/) builds `_generated/` artifacts and Bruin DAC locally. Public sites live under [`workspaces/`](workspaces/):

| Workspace | URL (local) |
|-----------|-------------|
| `@pps/site` | `http://localhost:4321/` |
| `@pps/analytics` | `http://localhost:4323/analytics/` |
| `@pps/network` | `http://localhost:4324/network/` |
| `@pps/roadmap` | `http://localhost:4322/roadmap/` (Vite) |
| `@pps/cms` | `http://localhost:5173/cms/` (Vite) |

Shared chrome lives in [`workspaces/shell/`](workspaces/shell/) (`@pps/shell`).

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
pnpm dev              # host + CMS at http://localhost:4321/ and /cms/
pnpm dev:analytics
pnpm dev:network
pnpm dev:roadmap
pnpm dev:cms
pnpm build:pages      # combined GitHub Pages dist/
pnpm inspect
```

Content directory defaults to `content/pages/` via `workspaces/analytics-cli/pps.config.ts`. Override with `--content` or `PPS_CONTENT_DIR`.

## Outputs

`pnpm build:content` writes under `workspaces/analytics-cli/_generated/`:

- `curriculum-graph.json` — full domain graph
- `graph.cy.json` — Cytoscape.js elements for visualization
- `dashboards.json` — static snapshot of all DAC dashboards for the analytics UI
- `diagnostics.json`
- `summary.md`
- `dac/` — Bruin DAC project (local dev)

Artifacts sync into each app's `public/data/` via `scripts/sync-analytics-data.mjs`.

## GitHub Pages

`pnpm build:pages` builds all five sites and merges them into `dist/` for GitHub Pages (`/`, `/analytics/`, `/network/`, `/roadmap/`, `/cms/`).

Daily cron workflow: `.github/workflows/pages.yml` (optional Supabase pull → build → deploy).

## Supabase sync

```sh
pnpm --filter @pps/analytics-cli build
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-pull
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-push
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-status
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_STORAGE_BUCKET`.

## Logseq migration

```sh
npx tsx scripts/migrate-logseq-once.ts <legacy-mirror-pages-dir> content/pages
```
