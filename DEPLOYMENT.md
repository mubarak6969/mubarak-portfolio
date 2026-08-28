# Deployment & Admin Setup

This portfolio is a static frontend (`index.html`, `style.css`, `script.js`, `animations.js`) plus a small serverless API (`/api`) that reads and writes projects in a MySQL database, and a separate admin dashboard (`/admin`) for managing them. The public site never talks to the database directly — it only ever calls `/api/projects`, which enforces on the server who's allowed to write.

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

## 2. Database setup

Any MySQL 8+ compatible host works — this project only uses standard SQL, no provider-specific extensions. Options, roughly cheapest/simplest first:

- **PlanetScale**, **Railway**, or **Aiven** — all offer a MySQL instance with a connection string in the `mysql://user:pass@host:port/db` format `DATABASE_URL` expects.
- Any VPS/managed MySQL you already run.

Whichever you choose, set `DATABASE_URL` to its connection string, then run `npm run migrate` (and `npm run seed` once) pointed at it.

For **local development**, `scripts/setup-local-db.sql` creates a dedicated low-privilege local user and database — see that file for the one-time setup command.

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
| `DATABASE_URL` | yes | MySQL connection string |
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
5. Deploy. Then run the migration/seed **once** against the production database — either run `npm run migrate && npm run seed` locally with `DATABASE_URL` pointed at production, or add a temporary one-off script execution however your database provider supports it.
6. Visit `/admin` on your deployed domain and log in.

## 6. Session security notes

- Sessions are a signed JWT (`jsonwebtoken`, a standard audited library — no homemade crypto) in an `HttpOnly`, `SameSite=Strict` cookie, `Secure` in production. JavaScript on the page can never read it.
- Every write request is also checked against the request's `Origin`/`Referer` header as defense-in-depth against CSRF, on top of `SameSite=Strict`.
- Logout doesn't just clear the cookie — it increments a version counter stored in the `admin_session` table, and every request re-checks the token's stamped version against that counter. An old token is rejected even if an attacker somehow retained it. Because there's a single admin, logging out invalidates every session, everywhere, immediately.
- Passwords are hashed with Node's built-in `scrypt` (a standard, vetted KDF) plus a random salt, compared with a timing-safe equality check.

## 7. What's intentionally out of scope

- No user registration or multi-admin support — this is a single-owner CMS by design.
- No image upload — projects use the existing icon+gradient card treatment (matching the original design), not uploaded photos. Add real upload support later only if you actually need it.
