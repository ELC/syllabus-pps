# Agent Notes

Curriculum content lives in `content/pages/` as repo-native Markdown with YAML frontmatter. Supabase Storage is canonical for the hosted CMS; a daily cron syncs remote content into the repo for builds.

## Working With Content

- Edit local files in `content/pages/` for agent workflows, or use the CMS (`apps/cms`) for authors.
- Run `pnpm --filter pps-analytics exec node dist/src/cli/bin/cli.js sync --push` when local edits should update Supabase.
- Keep notes zettelkasten-style: small connected ideas, not Notion-like database records.
- Use bullet-only bodies (`- ` lines). Non-bullet lines trigger `non-bullet-content` diagnostics.
- Use native inline hashtags only when they naturally belong in the sentence.
- Avoid source-document pages, artifact pages, and administrative index pages unless the user explicitly asks for them.

## Page Format

```yaml
---
title: programación i
slug: programacion-i
kind: course
version: 1
updatedAt: 2026-01-01T00:00:00.000Z
---
- [[programación i]]
- #algoritmos
```

- Slug filenames on disk; `title` is the display name and wikilink target.
- `kind` is required for `career`, `year`, and `course`. Concepts may omit `kind`.
- Wikilinks resolve by title, then slug, then normalized match.

## PPS Analytics And DAC

Shared business logic lives in `packages/pps-core` (parser, graph, diagnostics, projections). The CLI in `pps-analytics` reads `content/pages/`, writes `_generated/`, and assembles Bruin DAC locally.

- Do not edit generated files under `pps-analytics/_generated/` by hand.
- Expected years/courses stay in `pps-analytics/pps.config.ts` via `contentDir`.
- CMS blocks saves on diagnostics with severity `error` or `warning`. CI fails on `error` only.

Useful commands from the repository root:

```sh
pnpm typecheck
pnpm test
pnpm build:content
pnpm dev
pnpm build:pages
pnpm inspect
```

After changing TypeScript analytics code, run typecheck, tests, and rebuild:

```sh
pnpm typecheck
pnpm test
pnpm build:content
dac validate --dir pps-analytics/_generated/dac
dac check --dir pps-analytics/_generated/dac
```

## Logseq Migration

Use the one-time script to import a legacy Logseq mirror:

```sh
npx tsx scripts/migrate-logseq-once.ts <mirror-pages-dir> content/pages
```
