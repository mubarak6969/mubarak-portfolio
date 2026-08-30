// Creates the projects + admin_session tables (and the updated_at trigger)
// if they don't exist yet. Safe to run repeatedly. Targets PostgreSQL
// (Supabase) — see lib/db.js for the connection/SSL setup.
require('../lib/load-env')();
const { query, getPool } = require('../lib/db');

async function migrate() {
    await query(`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT '',
            technologies JSONB NOT NULL,
            icon VARCHAR(50) NOT NULL DEFAULT 'fa-code',
            github_url VARCHAR(500) NOT NULL DEFAULT '',
            demo VARCHAR(500) NOT NULL DEFAULT '',
            featured BOOLEAN NOT NULL DEFAULT FALSE,
            published BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    // Postgres has no MySQL-style "ON UPDATE CURRENT_TIMESTAMP" column
    // option — a trigger is the standard way to keep updated_at current.
    await query(`
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);
    await query(`DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;`);
    await query(`
        CREATE TRIGGER projects_set_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    `);

    // Single-row table holding a session "epoch". Every login stamps this
    // value into the JWT; every logout increments it. A token whose stamped
    // epoch doesn't match the current one is rejected even if its signature
    // is still valid — this is what makes logout actually revoke access
    // instead of just deleting the cookie client-side.
    await query(`
        CREATE TABLE IF NOT EXISTS admin_session (
            id INTEGER PRIMARY KEY DEFAULT 1,
            version INTEGER NOT NULL DEFAULT 0
        );
    `);
    await query(`INSERT INTO admin_session (id, version) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`);

    console.log('Migration complete: projects + admin_session tables ready.');
    await getPool().end();
}

migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
