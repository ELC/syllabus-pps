# PPS

Curriculum notes and analytics for the PPS zettelkasten, stored as repo-native Markdown.

Source pages live in [`content/pages/`](content/pages/). Shared parsing, diagnostics, and projections live in [`workspaces/core/`](workspaces/core/). The CLI in [`workspaces/analytics-cli/`](workspaces/analytics-cli/) builds `_generated/` artifacts and Bruin DAC locally. Public sites live under [`workspaces/`](workspaces/):

| Workspace | URL (local via `pnpm dev`) |
|-----------|----------------------------|
| `@pps/site` | `http://localhost:4321/` |
| `@pps/analytics` | `http://localhost:4321/analytics/` |
| `@pps/network` | `http://localhost:4321/network/` |
| `@pps/roadmap` | `http://localhost:4321/roadmap/` |
| `@pps/cms` | `http://localhost:4321/cms/` |

Shared chrome lives in [`workspaces/shell/`](workspaces/shell/) (`@pps/shell`). Email OTP sign-in lives in [`workspaces/login/`](workspaces/login/) (`@pps/login`).

Agent-oriented conventions live in [AGENTS.md](AGENTS.md).

## Setup

From the repository root:

```sh
corepack enable
pnpm install
cp .env.example .env
```

Fill `.env` with the hosted Supabase **publishable** keys (`PUBLIC_SUPABASE_PROJECT_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The same file is used for local dev and production builds.

Requirements:

- Node.js 20+
- [pnpm](https://pnpm.io/) (via Corepack)
- [Bruin DAC](https://getbruin.com/docs/dac/) for local dashboards (`dac` on `PATH`)

## Commands

```sh
pnpm typecheck
pnpm test
pnpm build:content
pnpm dev              # single dev server at http://localhost:4321/ (all subsites embedded)
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

Analytics, network, and roadmap apps read those artifacts from `workspaces/analytics-cli/_generated/` through `analyticsDataPlugin` in `@pps/config`.

## GitHub Pages

`pnpm build:pages` builds all five sites and merges them into `dist/` for GitHub Pages (`/`, `/analytics/`, `/network/`, `/roadmap/`, `/cms/`).

Daily cron workflow: `.github/workflows/pages.yml` (optional Supabase pull → build → deploy).

Set GitHub Actions secrets `PUBLIC_SUPABASE_PROJECT_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as local `.env`). `pnpm build:pages` fails if either is missing.

## Site sign-in (AuthN)

The shell gates every surface behind email magic links. Allowed addresses live in Supabase Postgres (`public.allowed_emails`), enforced by the `before-user-created` Auth Hook — not in the frontend bundle.

Unauthenticated visits to `/analytics/`, `/cms/`, and other app routes redirect to the **site home** (`/`), where the login form is shown. After sign-in, the browser returns to the original URL.

### Supabase setup

1. Apply [`workspaces/login/sql/001_allowed_emails.sql`](workspaces/login/sql/001_allowed_emails.sql) and [`workspaces/login/sql/002_display_name.sql`](workspaces/login/sql/002_display_name.sql) in the Supabase SQL editor.
2. **Authentication → Providers → Email**: enable email; disable password sign-in.
3. **Authentication → Providers**: disable Google, GitHub, and other OAuth providers.
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

### Allow list

Add rows in **Table Editor → allowed_emails** (do not commit real addresses to git). Set optional **display_name** for the sidebar label. New sign-ups get `full_name` in auth metadata automatically via the `on_auth_user_apply_display_name` trigger in `002_display_name.sql`.

The navbar reads `user.user_metadata.full_name` from the Supabase session in localStorage — not a separate field. If it is missing, check that **display_name** is set on your allow-list row.

### Email delivery

This project uses **Supabase’s built-in mailer** (no custom SMTP). Auth emails are capped at **2 sends per hour** project-wide. After a successful login, sessions persist via refresh tokens — users do not need a new email on every visit.

If you hit the limit while testing, wait about an hour or use an earlier magic link from your inbox. The login UI shows a rate-limit message when Supabase returns `over_email_send_rate_limit`.

### Client env

The browser bundle needs only the publishable keys (never the service role):

- `PUBLIC_SUPABASE_PROJECT_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Copy `.env.example` to `.env` at the repository root for local dev. GitHub Actions uses the same variables as repository secrets for `pnpm build:pages`.

### Local test

```sh
pnpm dev
```

Open `http://localhost:4321/`, request a magic link, sign in, then visit Analytics, Network, Roadmap, and CMS. Repeat on the GitHub Pages URL after deploy.

Hosted CMS remains read-only; local `pnpm dev` still writes `content/pages/` after sign-in.

## Supabase sync

```sh
pnpm --filter @pps/analytics-cli build
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-pull
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-push
pnpm --filter @pps/analytics-cli exec node dist/src/cli/bin/cli.js sync-status
```

Optional CI sync reuses `PUBLIC_SUPABASE_PROJECT_URL` from the build job. Also set `SUPABASE_SERVICE_ROLE_KEY` and optionally `SUPABASE_STORAGE_BUCKET`.

## Logseq migration

```sh
npx tsx scripts/migrate-logseq-once.ts <legacy-mirror-pages-dir> content/pages
```
