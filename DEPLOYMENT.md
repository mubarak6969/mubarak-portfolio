# Deployment & Admin Setup

This portfolio is a static frontend (`index.html`, `style.css`, `script.js`, `animations.js`) plus a small serverless API (`/api`) that reads and writes projects in a PostgreSQL database (Supabase), and a separate admin dashboard (`/admin`) for managing them. The public site never talks to the database directly — it only ever calls `/api/projects`, which enforces on the server who's allowed to write.

## Why not GitHub Pages

GitHub Pages only serves static files — it cannot run the `/api` serverless functions or hold a database connection securely. If the frontend stays on GitHub Pages, the admin/API layer would have to be hosted elsewhere (e.g. Vercel) and the frontend would need to call that separate origin, which means configuring CORS and juggling two deployments. **This project is set up to deploy entirely on Vercel instead** — one deploy target, no CORS complexity, and Vercel serves the static files exactly as GitHub Pages would.

## 1. Local development

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values (see sections below for how to get each one). Then:

```bash
npm run migrate   # creates the projects + admin_session tables
npm run seed       # inserts the two existing portfolio projects, once
```

There's no bundler — open `index.html` directly, or serve the folder with any static server, for pure frontend work. For the API routes to work locally, either:

```bash
npm run dev
```
which starts `scripts/dev-server.js` — a small zero-dependency local server (no account/login needed) that serves the static files and routes `/api/*` to the same handler modules Vercel runs in production. Runs on port 3000 by default (`DEV_PORT=4173 npm run dev` to use a different port). This is dev tooling only; it's never deployed and Vercel does its own routing in production.

Or, for something closer to Vercel's exact runtime behavior:

```bash
npm i -g vercel
vercel dev
```

## 2. Database setup (Supabase)

This project uses [Supabase](https://supabase.com)'s managed PostgreSQL — one project serves both local development and production, so there's no separate local database to install or maintain.

1. Create a Supabase project (free tier is plenty for this).
2. In the dashboard: **Project Settings → Database → Connection string → Transaction pooler**. Copy that connection string — it looks like `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`.
3. Paste it into `DATABASE_URL` in your local `.env` (never in this chat, never committed).
4. Run the migration and seed once:
   ```bash
   npm run migrate   # creates the projects + admin_session tables and the updated_at trigger
   npm run seed       # inserts the two existing portfolio projects, once
   ```

**Why the Transaction Pooler specifically:** Supabase's direct connection and Session Pooler both hold one Postgres connection per client, which serverless functions exhaust quickly since every invocation can open a new one. The Transaction Pooler (PgBouncer in transaction mode) hands connections back to the pool between queries, which is what serverless needs. This project's `pg` usage is already compatible with it — every parameterized query uses unnamed prepared statements (the default), never a named one, which is the one thing transaction-mode pooling doesn't support.

**SSL:** Supabase requires SSL. `lib/db.js` enables it automatically for any non-localhost `DATABASE_URL` host.

Because local dev and production point at the same kind of database (just different Supabase projects, or the same one if you prefer), there's no separate "local database setup" step beyond steps 1–4 above.

**No Supabase SDK, no service-role key, no Supabase Auth.** This project connects to Supabase purely as a hosted PostgreSQL instance via the plain `pg` client and the connection string above — the same custom super-admin auth (scrypt + signed session cookie) from before is unchanged. There's no `@supabase/supabase-js`, no anon key, no service-role key anywhere in this codebase, and none is needed.

## 3. Admin setup

There is exactly one admin identity, configured entirely through environment variables — never hardcoded, never committed. Set it up with one interactive command:

```bash
npm run admin:create
```

This asks for a username and password directly in your terminal (password input is hidden), then writes `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` into your local `.env` for you — the plaintext password is never printed, logged, or saved anywhere. If `SESSION_SECRET` isn't already set, it generates one automatically. Re-running the command later updates the credentials (e.g. to change your password) without touching `SESSION_SECRET` if one already exists.

Log in at `/admin` with that username/password. Sessions last 7 days; logging out immediately invalidates the session server-side (not just clearing the cookie — see "Session security" below), and every session everywhere is invalidated together, since there's only one admin.

For production, copy the resulting `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` values from your local `.env` into Vercel's Environment Variables — `npm run admin:create` only writes to your local file, it never touches a deployed environment.

## 4. Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Supabase PostgreSQL connection string (Transaction Pooler) |
| `ADMIN_USERNAME` | yes | The one admin's login username |
| `ADMIN_PASSWORD_HASH` | yes | Set by `npm run admin:create` — never the plaintext |
| `SESSION_SECRET` | yes | Random string used to sign session cookies |
| `NODE_ENV` | set by Vercel | `production` on Vercel; enables the `Secure` cookie flag |
| `TEST_ADMIN_PASSWORD` | dev only | Only for `npm run test:api`; never set in production |

## 5. Vercel deployment

1. Push this repo to GitHub (already the case).
2. In the Vercel dashboard: **New Project → Import** this repo.
3. Vercel auto-detects the `/api` folder as serverless functions and serves everything else as static files — no build command needed.
4. Under **Settings → Environment Variables**, add `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (all "Production" — add to "Preview"/"Development" too if you want those environments to work).
5. Deploy. If Vercel's `DATABASE_URL` points at the same Supabase project you already migrated/seeded locally, there's nothing further to do — it's the same database. If you're using a *separate* Supabase project for production, run `npm run migrate && npm run seed` once locally with `DATABASE_URL` temporarily pointed at that production project's connection string.
6. Visit `/admin` on your deployed domain and log in.

## 6. Session security notes

- Sessions are a signed JWT (`jsonwebtoken`, a standard audited library — no homemade crypto) in an `HttpOnly`, `SameSite=Strict` cookie, `Secure` in production. JavaScript on the page can never read it.
- Every write request is also checked against the request's `Origin`/`Referer` header as defense-in-depth against CSRF, on top of `SameSite=Strict`.
- Logout doesn't just clear the cookie — it increments a version counter stored in the `admin_session` table, and every request re-checks the token's stamped version against that counter. An old token is rejected even if an attacker somehow retained it. Because there's a single admin, logging out invalidates every session, everywhere, immediately.
- Passwords are hashed with Node's built-in `scrypt` (a standard, vetted KDF) plus a random salt, compared with a timing-safe equality check.

## 7. What's intentionally out of scope

- No user registration or multi-admin support — this is a single-owner CMS by design.
- No image upload — projects use the existing icon+gradient card treatment (matching the original design), not uploaded photos. Add real upload support later only if you actually need it.
