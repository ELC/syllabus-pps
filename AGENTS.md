# Agent Notes

Curriculum pages live in Supabase Storage as markdown blobs (`pages/{slug}.md`). The resource catalog lives in Supabase Postgres (`public.resources`). `@pps/content` wraps both stores. CMS and Cites read/write Supabase; local dev proxies through the Vite server with `PUBLIC_AUTH_DISABLED=true`, hosted edits require sign-in.

## Documentation

Keep human-facing setup and operations docs in the root [README.md](README.md) only. Do not add workspace or `supabase/` README files.

## Shell assets

Shared chrome styles live in `@pps/shell` (`styles/shell.scss` and partials) and auth UI styles in `@pps/login/styles/login.scss`. Import them through the bundler (`import shellCss from "@pps/shell/styles/shell.scss?url"` in Astro, or `import "@pps/shell/shell-chrome"` in Vite SPAs). Do not copy CSS into app `public/` folders.

Astro apps register `import ppsShell from "@pps/shell/astro"` in `integrations`. Vite SPAs (CMS, cites, roadmap) import `shellHeadPlugin` from `@pps/shell/vite`. Integration sources live in `workspaces/shell/integration/`.

## Dependency versions

Shared tool versions (`astro`, `react`, `vite`, `typescript`, and related types) are defined once in the root `pnpm-workspace.yaml` `catalog` and referenced as `"catalog:"` in workspace `package.json` files.

## Analytics artifacts

Compiled analytics for viz apps live in Supabase Postgres (`public.analytics_artifacts`). Analytics, Network, and Roadmap load them only via `loadAnalyticsArtifact` from `@pps/content/browser` (no `/data/*.json` or `_generated/` JSON at runtime). CMS/Cites trigger rebuild after save (Edge Function hosted, dev POST `/api/rebuild-analytics`). `pnpm build:content` upserts Postgres and writes `workspaces/analytics-cli/_generated/` for DAC assembly, CLI inspect, and tests—not for viz apps.

## Workspace packages

Prefer `workspace:*` dependencies and package `exports` over Vite aliases. `@pps/core` exposes `./src/index.ts` under the `development` export condition for Vite dev; production builds use `dist/`. Shared Vite env helpers and plugins live in `@pps/config` (built to `dist/` before app builds). `@pps/shell` Astro/Vite integration sources live in `workspaces/shell/integration/` and compile to `integration/dist/` for nested Vite config loading.

Local dev runs only `@pps/site` on port 4321; CMS, cites, roadmap, analytics, and network mount into that server via `subsitesDevPlugins()` from `@pps/config`.

## Workspace packages

Prefer `workspace:*` dependencies and package `exports` over Vite aliases. `@pps/core` exposes `./src/index.ts` under the `development` export condition for Vite dev; production builds use `dist/`.

## Working With Content

- Edit pages in the CMS (`workspaces/cms`) at `/cms/` or upload markdown to Supabase Storage.
- Edit resources in Cites (`workspaces/cites`) at `/cites/` or insert rows in `public.resources`.
- Run `pnpm build:content` after content changes so analytics artifacts stay current (`SUPABASE_SERVICE_ROLE_KEY` required).
- Keep notes zettelkasten-style: small connected ideas, not Notion-like database records.
- Use bullet-only bodies (`- ` lines). Non-bullet lines trigger `non-bullet-content` diagnostics.
- Do not link a page to itself; the title already identifies the page.
- Use native inline hashtags only when they naturally belong in the sentence.
- Avoid source-document pages, artifact pages, and administrative index pages unless the user explicitly asks for them.
- External sources live in the shared CSL-JSON resource catalog (Supabase Postgres); concept bullets cite them with `[@resource-id]` and keep the concept-specific explanation in prose.
- Concept pages need at least three source citations per page: mix Wikipedia, beginner-friendly written resources (short and long), and video resources (short and long, e.g. a single video and a playlist).
- Each concept page also needs at least one book source, preferably published within the last ten years; name the book in prose and cite its catalog entry.
- Write concept notes as prose bullets; each bullet should carry at least one `[@resource-id]` and briefly explain what that source covers. Avoid placeholder phrasing such as "curso extenso" or "video corto".
- Do not put bare URLs in concept bullets; add or reuse a catalog entry in Cites instead.
- Prefer interactive, video, and rich web formats over plain-text notes when choosing non-book sources; verify that linked titles and content match the bullet, not just HTTP status.
- Prefer videos published within the last five years; replace stale lecture captures when a recent equivalent exists.
- When citing MIT courses, name the course code and term/year in prose (e.g. `MIT 6.1200J (primavera 2024)`).

## Page Format

```yaml
---
title: programación i
slug: programacion-i
kind: course
version: 1
updatedAt: 2026-01-01T00:00:00.000Z
---
- #algoritmos
```

Concept pages use the same shape with `kind: concept`:

```yaml
---
title: algoritmos
kind: concept
---
- un algoritmo es un procedimiento finito para resolver un problema; la Wikipedia en español distingue algoritmo, programa e implementación [@algoritmo]
- CS50x recorre búsqueda, ordenamiento y notación O con pseudocódigo y código en C [@asymptotic-notation]
```

- Slug filenames on disk; `title` is the display name and wikilink target.
- `kind` is required for `degree`, `year`, `course`, and `concept`.
- Course pages belong to either `Trayecto Principal` (default) or `Trayecto No Estructurado`; declare TNE electives with `trayecto: no-estructurado` or `trayecto: Trayecto No Estructurado` (styled separately in roadmap and network).
- Wikilinks resolve by title, then slug, then normalized match.

## PPS Analytics And DAC

Shared business logic lives in `workspaces/core` (parser, graph, diagnostics, projections). Supabase I/O lives in `workspaces/content` (`@pps/content`). The CLI in `workspaces/analytics-cli` (`@pps/analytics-cli`) reads Supabase at build time, upserts analytics tables, writes `_generated/dac/` (and local JSON for tests/inspect), and assembles Bruin DAC locally.

- Do not edit generated files under `workspaces/analytics-cli/_generated/` by hand.
- Degrees declare `years:` (count) in frontmatter; the CMS provisions `kind: year` pages as `{degreeSlug}-ano-{n}` with `degree`, `yearIndex`, and `courses` (course page **slugs**, not titles).
- Network and roadmap labels for years use `año N`; stored titles stay unique (`{degree} · año N`).
- `pps.config.ts` only supplies optional CLI paths (e.g. `contentDir`).
- CMS blocks saves on diagnostics with severity `error` or `warning`. CI fails on `error` only.

Useful commands from the repository root:

```sh
pnpm typecheck
pnpm test
pnpm build:content
pnpm dev
pnpm build:pages
pnpm inspect
pnpm serve:dac
```

After changing TypeScript analytics code, run typecheck, tests, and rebuild:

```sh
pnpm typecheck
pnpm test
pnpm build:content
dac validate --dir workspaces/analytics-cli/_generated/dac
dac check --dir workspaces/analytics-cli/_generated/dac
```

Bruin DAC reads **`public.analytics_dac_metrics`** and **`public.analytics_dac_rows`** in Supabase Postgres (`SUPABASE_DB_*` in `.env`). Rebuild populates those tables together with `analytics_artifacts`.

## Logseq Migration

Use the one-time script to import a legacy Logseq mirror:

```sh
npx tsx scripts/migrate-logseq-once.ts <mirror-pages-dir> content/pages
```
