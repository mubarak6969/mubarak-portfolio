// Shared MySQL connection pool for all API routes. One pool per serverless
// process — mysql2 handles pooling/reconnection, and Vercel reuses warm
// function instances between invocations so this isn't recreated per request.
const mysql = require('mysql2/promise');

let pool;

function getPool() {
    if (!pool) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not set');
        }
        pool = mysql.createPool({
            uri: url,
            waitForConnections: true,
            connectionLimit: 5,
            maxIdle: 5,
            idleTimeout: 60000,
            queueLimit: 0
        });
    }
    return pool;
}

async function query(sql, params) {
    const [rows] = await getPool().execute(sql, params);
    return rows;
}

module.exports = { getPool, query };
