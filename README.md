# PPS

Curriculum notes and analytics for the PPS zettelkasten.

Pages live in Supabase Storage (`pages/{slug}.md`). The resource catalog lives in Supabase Postgres (`public.resources`). Shared parsing, diagnostics, and projections live in [`workspaces/core/`](workspaces/core/). Supabase access helpers live in [`workspaces/content/`](workspaces/content/) (`@pps/content`). The CLI in [`workspaces/analytics-cli/`](workspaces/analytics-cli/) reads Supabase at build time, upserts analytics tables, and writes `_generated/` (DAC + inspect artifacts). Public sites live under [`workspaces/`](workspaces/):

| Workspace | URL (local via `pnpm dev`) |
|-----------|----------------------------|
| `@pps/site` | `http://localhost:4321/` |
| `@pps/analytics` | `http://localhost:4321/analytics/` |
| `@pps/network` | `http://localhost:4321/network/` |
| `@pps/roadmap` | `http://localhost:4321/roadmap/` |
| `@pps/cms` | `http://localhost:4321/cms/` |
| `@pps/cites` | `http://localhost:4321/cites/` |

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

`pnpm build:pages` builds all public sites and merges them into `dist/` for GitHub Pages (`/`, `/analytics/`, `/network/`, `/roadmap/`, `/cms/`, `/cites/`).

Daily cron workflow: `.github/workflows/pages.yml` (build from Supabase → deploy).

Set GitHub Actions secrets `PUBLIC_SUPABASE_PROJECT_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as local `.env`). `pnpm build:pages` fails if either is missing. Optionally add `PUBLIC_GA_MEASUREMENT_ID` to enable Google Analytics on the deployed site.

## Site sign-in (AuthN)

The shell gates every surface behind Supabase Auth. Users can sign in with **Google OAuth** or an **email magic link**. Allowed addresses live in Supabase Postgres (`public.allowed_emails`), enforced by the `before-user-created` Auth Hook — not in the frontend bundle.

Unauthenticated visits to `/analytics/`, `/cms/`, and other app routes redirect to the **site home** (`/`), where the login form is shown. After sign-in, the browser returns to the original URL.

### Supabase setup

1. Apply [`workspaces/login/sql/001_allowed_emails.sql`](workspaces/login/sql/001_allowed_emails.sql) and [`workspaces/login/sql/002_display_name.sql`](workspaces/login/sql/002_display_name.sql) in the Supabase SQL editor.
2. **Authentication → Providers → Email**: enable email; disable password sign-in.
3. **Authentication → Providers → Google**: enable Google and paste the OAuth client ID and secret from [Google Cloud Console](https://console.cloud.google.com/auth/clients):
   - Create a **Web application** OAuth client.
   - **Authorized JavaScript origins**: `http://localhost:4321`, `http://127.0.0.1:4321`, and your production origin (e.g. `https://elc.github.io`).
   - **Authorized redirect URI**: copy the callback URL from the Supabase Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - Disable GitHub and other OAuth providers you do not use.
4. **Authentication → URL Configuration**:
   - **Site URL**: hosted production origin (e.g. `https://elc.github.io/syllabus-pps/`).
   - **Redirect URLs** (allow list): must include local dev or magic links fall back to Site URL:
     - `http://localhost:**/**` (any local port — Astro may pick 4322+ if 4321 is busy)
     - `http://127.0.0.1:**/**`
     - `https://elc.github.io/syllabus-pps/**`
5. **Authentication → Hooks → before-user-created**: enable and set URI to `pg-functions://postgres/public/hook_restrict_signup_by_allowed_email`.

   Or run once with a [personal access token](https://supabase.com/dashboard/account/tokens):

   ```sh
   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/configure-supabase-auth.mjs
   ```

   To enable Google programmatically, also set `SUPABASE_GOOGLE_CLIENT_ID` and `SUPABASE_GOOGLE_CLIENT_SECRET` before running the script.

### Allow list

Add rows in **Table Editor → allowed_emails** (do not commit real addresses to git). Set optional **display_name** for the sidebar label. New sign-ups get `full_name` in auth metadata automatically via the `on_auth_user_apply_display_name` trigger in `002_display_name.sql`.

The navbar reads `user.user_metadata.full_name` from the Supabase session in localStorage — not a separate field. If it is missing, check that **display_name** is set on your allow-list row.

### Email delivery

This project uses **Supabase’s built-in mailer** (no custom SMTP). Auth emails are capped at **2 sends per hour** project-wide. After a successful login, sessions persist via refresh tokens — users do not need a new email on every visit.

If you hit the limit while testing, wait about an hour, use an earlier magic link from your inbox, or sign in with Google instead. The login UI shows a rate-limit message when Supabase returns `over_email_send_rate_limit`.

Google sign-in uses the same allow list: the Google account email must already exist in `allowed_emails`.

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

**Fast path** (after `.env` has `SUPABASE_DB_*`):

```sh
pnpm apply:analytics-sql
```

If the pooler is unreachable from your network, paste `003`–`006` from [`workspaces/content/sql/`](workspaces/content/sql/) into **Supabase → SQL → New query** and run.

Create a Storage bucket named `content` (or set `SUPABASE_STORAGE_BUCKET`) with markdown pages under `pages/{slug}.md`.

### Initial analytics seed

After `003`/`004`, populate compiled read models:

```sh
pnpm build:content
```

You should see `Synced analytics artifacts and DAC tables to Supabase Postgres` with no warning.

Or invoke the Edge Function:

```sh
curl -X POST "https://<ref>.supabase.co/functions/v1/rebuild-analytics" \
  -H "Authorization: Bearer <anon-or-service-key>"
```

### Analytics rebuild (ongoing)

Compiled read models for Analytics, Network, and Roadmap live in **`public.analytics_artifacts`** (`key`, `body` jsonb). They are rebuilt from Storage pages + `public.resources`.

- **After CMS/Cites save (hosted):** browsers call Edge Function `rebuild-analytics` (fire-and-forget, last write wins).
- **Local dev:** CMS/Cites POST to `/cms/api/rebuild-analytics` or `/cites/api/rebuild-analytics` (Vite middleware).
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
