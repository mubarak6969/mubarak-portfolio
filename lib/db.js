// Shared PostgreSQL connection pool for all API routes. One pool per
// serverless process — Vercel reuses warm function instances between
// invocations so this isn't recreated per request.
//
// Targets Supabase's Transaction Pooler (PgBouncer in transaction mode):
// node-postgres uses unnamed prepared statements for parameterized queries
// by default (we never pass an explicit statement `name`), which is exactly
// what transaction-mode pooling supports — no special config needed beyond
// connecting with SSL, which Supabase requires.
const { Pool } = require('pg');

let pool;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not set');
        }

        const isLocal = /^(localhost|127\.0\.0\.1)$/.test(new URL(connectionString).hostname);

        pool = new Pool({
            connectionString,
            max: 5,
            idleTimeoutMillis: 60000,
            // Supabase requires SSL; rejectUnauthorized: false avoids needing
            // to bundle Supabase's CA chain for this use case. A local
            // Postgres instance (if ever used) typically has no SSL at all.
            ssl: isLocal ? false : { rejectUnauthorized: false }
        });
    }
    return pool;
}

// Returns the full pg result ({ rows, rowCount, ... }) — callers use
// `.rows` for SELECT/RETURNING data and `.rowCount` to check how many rows
// an UPDATE/DELETE touched.
async function query(text, params) {
    return getPool().query(text, params);
}

module.exports = { getPool, query };
