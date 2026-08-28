// Creates the projects table if it doesn't exist yet. Safe to run repeatedly.
require('../lib/load-env')();
const { query, getPool } = require('../lib/db');

async function migrate() {
    await query(`
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT '',
            technologies JSON NOT NULL,
            icon VARCHAR(50) NOT NULL DEFAULT 'fa-code',
            github_url VARCHAR(500) NOT NULL DEFAULT '',
            demo VARCHAR(500) NOT NULL DEFAULT '',
            featured BOOLEAN NOT NULL DEFAULT FALSE,
            published BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Single-row table holding a session "epoch". Every login stamps this
    // value into the JWT; every logout increments it. A token whose stamped
    // epoch doesn't match the current one is rejected even if its signature
    // is still valid — this is what makes logout actually revoke access
    // instead of just deleting the cookie client-side.
    await query(`
        CREATE TABLE IF NOT EXISTS admin_session (
            id INT PRIMARY KEY DEFAULT 1,
            version INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await query(`INSERT IGNORE INTO admin_session (id, version) VALUES (1, 0)`);

    console.log('Migration complete: projects + admin_session tables ready.');
    await getPool().end();
}

migrate().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
