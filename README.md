# PPS

Curriculum notes and analytics for the PPS zettelkasten.

Pages live in Supabase Storage (`pages/{slug}.md`). The resource catalog lives in Supabase Postgres (`public.resources`). Shared parsing, diagnostics, and projections live in [`workspaces/core/`](workspaces/core/). Supabase access helpers live in [`workspaces/content/`](workspaces/content/) (`@pps/content`). The CLI in [`workspaces/analytics-cli/`](workspaces/analytics-cli/) reads Supabase at build time, upserts analytics tables, and writes `_generated/` (DAC + inspect artifacts). Public sites live under [`workspaces/`](workspaces/):

| Workspace | URL (local via `pnpm dev`) |
|-----------|----------------------------|
| `@pps/site` | `http://localhost:4321/` |
| `@pps/analytics` | `http://localhost:4321/analytics/` |
| `@pps/network` | `http://localhost:4321/network/` |
| `@pps/roadmap` | `http://localhost:4321/roadmap/` |
| `@pps/planning` | `http://localhost:4321/planning/` |
| `@pps/cms` | `http://localhost:4321/cms/` |
| `@pps/cites` | `http://localhost:4321/cites/` |
| `@pps/users` | `http://localhost:4321/users/` |

Shared chrome lives in [`workspaces/shell/`](workspaces/shell/) (`@pps/shell`). Email OTP sign-in lives in [`workspaces/login/`](workspaces/login/) (`@pps/login`).

Agent-oriented conventions live in [AGENTS.md](AGENTS.md).

## Setup

From the repository root:

```sh
corepack enable
pnpm install
cp .env.example .env
```

Fill `.env` with Supabase keys (`PUBLIC_SUPABASE_PROJECT_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_STORAGE_BUCKET`). Set `PUBLIC_AUTH_DISABLED=true` for local CMS/Cites without sign-in. The same file is used for local dev and production builds.

Requirements:

- Node.js 20+
- [pnpm](https://pnpm.io/) (via Corepack)
- [Bruin DAC](https://getbruin.com/docs/dac/) for local dashboards (`dac` on `PATH`)

## Commands

```sh
pnpm typecheck
pnpm test
pnpm build:content
pnpm sync:pages       # upload content/pages to Supabase Storage (requires .env)
pnpm dev              # single dev server at http://localhost:4321/ (all subsites embedded)
pnpm build:pages      # combined GitHub Pages dist/
pnpm inspect
```

Analytics, Network, and Roadmap read compiled artifacts only from **`public.analytics_artifacts`** in Supabase Postgres (`loadAnalyticsArtifact` in `@pps/content/browser`). CMS and Cites trigger a rebuild after save (Edge Function in production, dev API locally). GitHub Pages deploy does not run `build:content`; seed Postgres once after applying analytics SQL (see [Supabase content and analytics](#supabase-content-and-analytics)).

`pnpm build:content` upserts Postgres when `SUPABASE_SERVICE_ROLE_KEY` is set and writes local `_generated/` for Bruin DAC, `pnpm inspect`, and tests—not for viz runtime. For tests only, set `PPS_CONTENT_SOURCE=filesystem` to read `content/pages/` and `content/resources.json`.

## CLI outputs (`pnpm build:content`)

Under `workspaces/analytics-cli/_generated/`:

- `curriculum-graph.json`, `graph.cy.json`, `dashboards.json`, `diagnostics.json` — mirrors of Postgres rows (inspect/tests)
- `summary.md`
- `dac/` — Bruin DAC project (local dashboards)

## GitHub Pages

`pnpm build:pages` builds all public sites and merges them into `dist/` for GitHub Pages (`/`, `/analytics/`, `/network/`, `/roadmap/`, `/planning/`, `/cms/`, `/cites/`, `/users/`).

Daily cron workflow: `.github/workflows/pages.yml` (build from Supabase → deploy).

Set GitHub Actions secrets `PUBLIC_SUPABASE_PROJECT_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as local `.env`). `pnpm build:pages` fails if either is missing. Optionally add `PUBLIC_GA_MEASUREMENT_ID` to enable Google Analytics on the deployed site.

## Site sign-in (AuthN) and admin access (AuthZ)

The shell gates every surface behind Supabase Auth. Users can sign in with **Google OAuth** or an **email magic link**. **Any valid account can sign in.** Admin rights come from Supabase Postgres (`public.app_admins`): only listed emails can edit content, resources, roadmap layouts, weekly programs, trigger analytics rebuilds, or open the **Users** admin app.

Non-admin (viewer) accounts see **Network**, **Roadmaps**, and **Programa** (read-only labels); editing UI and admin routes redirect to Network.

Unauthenticated visits to `/analytics/`, `/cms/`, and other app routes redirect to the **site home** (`/`), where the login form is shown. After sign-in, the browser returns to the original URL when permitted for that role.

### Supabase setup

1. Apply AuthZ SQL once (creates `public.app_admins`, `is_app_admin()`, and admin-only write policies):

   ```sh
   pnpm apply:auth-sql
   ```

   Sources: [`workspaces/login/sql/003_app_admins.sql`](workspaces/login/sql/003_app_admins.sql) and [`workspaces/content/sql/008_admin_write_rls.sql`](workspaces/content/sql/008_admin_write_rls.sql).

2. Seed at least one admin row (or use **Users** after the first manual seed), then disable the legacy sign-up hook if it is still enabled (**Authentication → Hooks → before-user-created** → off). The old `allowed_emails` hook is no longer required for open sign-in.

3. **Authentication → Providers → Email**: enable email; disable password sign-in.
4. **Authentication → Providers → Google**: enable Google and paste the OAuth client ID and secret from [Google Cloud Console](https://console.cloud.google.com/auth/clients):
   - Create a **Web application** OAuth client.
   - **Authorized JavaScript origins**: `http://localhost:4321`, `http://127.0.0.1:4321`, and your production origin (e.g. `https://elc.github.io`).
   - **Authorized redirect URI**: copy the callback URL from the Supabase Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - Disable GitHub and other OAuth providers you do not use.
5. **Authentication → URL Configuration**:
   - **Site URL**: hosted production origin (e.g. `https://elc.github.io/syllabus-pps/`).
   - **Redirect URLs** (allow list): must include local dev or magic links fall back to Site URL:
     - `http://localhost:**/**` (any local port — Astro may pick 4322+ if 4321 is busy)
     - `http://127.0.0.1:**/**`
     - `https://elc.github.io/syllabus-pps/**`
6. Optional: run once with a [personal access token](https://supabase.com/dashboard/account/tokens) to set Site URL, redirect allow list, and disable the legacy hook:

   ```sh
   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/configure-supabase-auth.mjs
   ```

   To enable Google programmatically, also set `SUPABASE_GOOGLE_CLIENT_ID` and `SUPABASE_GOOGLE_CLIENT_SECRET` before running the script.

### Administrators

Manage admins at **`/users/`** (admin-only): add or remove rows by **display name** and **email**. Optional `display_name` on `app_admins` is copied into `auth.users` metadata on first sign-in for the sidebar label.

The navbar reads `user.user_metadata.full_name` from the Supabase session in localStorage — not a separate field. If it is missing, set **display name** on the admin row in **Users**.

### Email delivery

This project uses **Supabase’s built-in mailer** (no custom SMTP). Auth emails are capped at **2 sends per hour** project-wide. After a successful login, sessions persist via refresh tokens — users do not need a new email on every visit.

If you hit the limit while testing, wait about an hour, use an earlier magic link from your inbox, or sign in with Google instead. The login UI shows a rate-limit message when Supabase returns `over_email_send_rate_limit`.

Google sign-in does not require a pre-approved email; admin rights still follow `app_admins` only.

### Client env

The browser bundle needs only the publishable keys (never the service role):

- `PUBLIC_SUPABASE_PROJECT_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_GA_MEASUREMENT_ID` (optional GA4 id, e.g. `G-XXXXXXXX`; production builds only)

Copy `.env.example` to `.env` at the repository root for local dev. GitHub Actions uses the same variables as repository secrets for `pnpm build:pages`.

### Local test

```sh
pnpm dev
```

With `PUBLIC_AUTH_DISABLED=true`, open `http://localhost:4321/cms/` and `/cites/` without sign-in. Analytics, Network, and Roadmap need rows in `public.analytics_artifacts` (run `pnpm build:content` after SQL). On the hosted site, sign in before editing CMS or Cites.

## Supabase content and analytics

### SQL (apply in order)

In the SQL editor or via Postgres:

1. [`workspaces/login/sql/`](workspaces/login/sql/) — auth allowlist (if not already applied)
2. [`workspaces/content/sql/001_resources.sql`](workspaces/content/sql/001_resources.sql)
3. [`workspaces/content/sql/002_storage_pages.sql`](workspaces/content/sql/002_storage_pages.sql)
4. [`workspaces/content/sql/003_analytics_artifacts.sql`](workspaces/content/sql/003_analytics_artifacts.sql)
5. [`workspaces/content/sql/004_analytics_dac.sql`](workspaces/content/sql/004_analytics_dac.sql) — Bruin DAC query tables
6. [`workspaces/content/sql/005_analytics_rebuild_status.sql`](workspaces/content/sql/005_analytics_rebuild_status.sql) — rebuild progress for CMS/Cites
7. [`workspaces/content/sql/006_roadmap_course_layouts.sql`](workspaces/content/sql/006_roadmap_course_layouts.sql) — curated degree roadmap grid overrides
8. [`workspaces/content/sql/007_roadmap_concept_layouts.sql`](workspaces/content/sql/007_roadmap_concept_layouts.sql) — per-course concept map curations
9. [`workspaces/content/sql/008_admin_write_rls.sql`](workspaces/content/sql/008_admin_write_rls.sql) — admin-only content writes
10. [`workspaces/content/sql/009_planning_plans.sql`](workspaces/content/sql/009_planning_plans.sql) — 15-week course programs

**Fast path** (after `.env` has `SUPABASE_DB_*`):

```sh
pnpm apply:analytics-sql
```

If the pooler is unreachable from your network, paste the required migrations from [`workspaces/content/sql/`](workspaces/content/sql/) into **Supabase → SQL → New query** and run.

Create a Storage bucket named `content` (or set `SUPABASE_STORAGE_BUCKET`) with markdown pages under `pages/{slug}.md`.

### Initial analytics seed

After `003`/`004`, populate compiled read models:

```sh
pnpm build:content
```

You should see `Synced analytics artifacts and DAC tables to Supabase Postgres` with no warning.

### Roadmap concept layouts (Postgres)

Per-course concept maps live in `public.roadmap_concept_layouts`. The typed document shape is `RoadmapCuration` / `RoadmapConceptLayoutDocument` in `@pps/core` (parse with `parseRoadmapCurationDocument`). Storage is exactly **one** `parallelLanes[0].spine` (on-column order) plus `branches` / `branchOwnerOverrides` for laterals; the parser rejects multiple lanes. Layouts load from Postgres (or start empty until saved). Clear browser storage after deploy if you cached old curation JSON locally.

Dry-run normalization for all rows (requires `.env` with Supabase server keys):

```sh
node --env-file=.env node_modules/.bin/tsx scripts/normalize-roadmap-concept-layouts.ts
node --env-file=.env node_modules/.bin/tsx scripts/normalize-roadmap-concept-layouts.ts --write
node --env-file=.env node_modules/.bin/tsx scripts/normalize-roadmap-concept-layouts.ts --write --degree lds
```

After `pnpm install`, `pnpm normalize:roadmap-concept-layouts` runs a dry-run (builds `@pps/core` and `@pps/content` first). Pass `--write` and optional `--degree <slug>` as extra args: `pnpm normalize:roadmap-concept-layouts -- --write --degree lds`.

Saving from the Roadmap concept editor applies the same normalization before upsert.

Or invoke the Edge Function:

```sh
curl -X POST "https://<ref>.supabase.co/functions/v1/rebuild-analytics" \
  -H "Authorization: Bearer <anon-or-service-key>"
```

### Analytics rebuild (ongoing)

Compiled read models for Analytics, Network, and Roadmap live in **`public.analytics_artifacts`** (`key`, `body` jsonb). They are rebuilt from Storage pages + `public.resources`.

- **After CMS/Cites/Planning save (hosted):** browsers call Edge Function `rebuild-analytics` (fire-and-forget, last write wins).
- **Local dev:** content editors POST to `/api/rebuild-analytics` (Vite middleware).
- **CLI:** `pnpm build:content` syncs Postgres and refreshes local `_generated/dac/`.

#### Deploy Edge Function

From the repo root ([Supabase CLI](https://supabase.com/docs/guides/cli)):

```sh
# Corporate SSL-inspecting proxy: export SSL_CERT_FILE=/path/to/cacert.pem
supabase link --project-ref <your-project-ref>
pnpm deploy:rebuild-analytics   # esbuild bundle + deploy (needs SUPABASE_ACCESS_TOKEN in .env)
```

Set secrets (`supabase secrets set` or dashboard): `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (if not default). `verify_jwt` is off for now; tighten when auth rules are defined.

### Bruin DAC (local)

Generated project: `workspaces/analytics-cli/_generated/dac`. Queries use Postgres connection **`pps_supabase`** (see `.bruin.yml`), not local DuckDB.

Set `SUPABASE_DB_*` in `.env` (pooler host, `postgres.<project-ref>` user, DB password). Then:

```sh
pnpm build:content   # syncs analytics_dac_* tables
pnpm serve:dac       # dac serve --dir workspaces/analytics-cli/_generated/dac
dac connections --dir workspaces/analytics-cli/_generated/dac
```

### Remote status

```sh
pnpm --filter @pps/analytics-cli build
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-status
```

## Logseq migration

```sh
npx tsx scripts/migrate-logseq-once.ts <legacy-mirror-pages-dir> content/pages
```
