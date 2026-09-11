# Agent Notes

Curriculum content lives in `content/pages/` as repo-native Markdown with YAML frontmatter. Supabase Storage is canonical for the hosted CMS; a daily cron syncs remote content into the repo for builds.

## Working With Content

- Edit local files in `content/pages/` for agent workflows, or use the CMS (`workspaces/cms`) for authors.
- Run `pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync --push` when local edits should update Supabase.
- Keep notes zettelkasten-style: small connected ideas, not Notion-like database records.
- Use bullet-only bodies (`- ` lines). Non-bullet lines trigger `non-bullet-content` diagnostics.
- Do not link a page to itself; the title already identifies the page.
- Use native inline hashtags only when they naturally belong in the sentence.
- Avoid source-document pages, artifact pages, and administrative index pages unless the user explicitly asks for them.
- Concept pages need at least three source links per page: mix Wikipedia, beginner-friendly written resources (short and long), and video resources (short and long, e.g. a single video and a playlist).
- Each concept page also needs at least one book source, preferably published within the last ten years; name the book in prose and link to its official page or open edition.
- Write concept notes as prose bullets; each bullet should carry at least one source URL and briefly explain what that source covers. Avoid placeholder phrasing such as "curso extenso" or "video corto".
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
- un algoritmo es un procedimiento finito para resolver un problema; la Wikipedia en español distingue algoritmo, programa e implementación https://es.wikipedia.org/wiki/Algoritmo
- MDN resume qué es un algoritmo y cómo se relaciona con código ejecutable https://developer.mozilla.org/es/docs/Glossary/Algorithm
```

- Slug filenames on disk; `title` is the display name and wikilink target.
- `kind` is required for `career`, `year`, `course`, and `concept`.
- Wikilinks resolve by title, then slug, then normalized match.

## PPS Analytics And DAC

Shared business logic lives in `workspaces/core` (parser, graph, diagnostics, projections). The CLI in `workspaces/analytics-cli` (`@pps/analytics-cli`) reads `content/pages/`, writes `_generated/`, and assembles Bruin DAC locally.

- Do not edit generated files under `workspaces/analytics-cli/_generated/` by hand.
- Expected years/courses stay in `workspaces/analytics-cli/pps.config.ts` via `contentDir`.
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
dac validate --dir workspaces/analytics-cli/_generated/dac
dac check --dir workspaces/analytics-cli/_generated/dac
```

## Logseq Migration

Use the one-time script to import a legacy Logseq mirror:

```sh
npx tsx scripts/migrate-logseq-once.ts <mirror-pages-dir> content/pages
```
