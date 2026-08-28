// Local development server that mimics Vercel's routing conventions closely
// enough for real end-to-end testing: static files served from the repo
// root, `/api/*` routed to the matching handler module (including `[id]`
// dynamic segments), JSON bodies parsed the way Vercel's Node runtime does
// automatically in production. This file is dev-only tooling — Vercel does
// its own routing/serving in production, this script is never deployed.
require('../lib/load-env')();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.DEV_PORT || 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Maps a URL path to an API handler module, resolving `[id]` dynamic
// segments the same way Vercel's file-based routing does.
function resolveApiHandler(urlPath) {
    const segments = urlPath.replace(/^\/api\//, '').split('/').filter(Boolean);
    const candidates = [
        segments.join('/'),                                    // e.g. "auth/login"
        [...segments.slice(0, -1), '[id]'].join('/'),           // e.g. "projects/[id]" (from "projects/5")
        [...segments.slice(0, -2), '[id]', segments[segments.length - 1]].join('/') // "projects/[id]/publish"
    ];

    for (const candidate of candidates) {
        const directPath = path.join(ROOT, 'api', candidate + '.js');
        const indexPath = path.join(ROOT, 'api', candidate, 'index.js');
        const filePath = fs.existsSync(directPath) ? directPath : (fs.existsSync(indexPath) ? indexPath : null);
        if (filePath) {
            const params = {};
            const dynamicIndex = candidate.split('/').indexOf('[id]');
            if (dynamicIndex !== -1) params.id = segments[dynamicIndex];
            return { handler: require(filePath), params };
        }
    }
    return null;
}

function serveStatic(req, res, urlPath) {
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    // cleanUrls-style resolution, matching vercel.json: /admin -> /admin/index.html
    let fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        fullPath = path.join(ROOT, filePath, 'index.html');
    }
    if (!fs.existsSync(fullPath) && !path.extname(filePath)) {
        fullPath = path.join(ROOT, filePath + '.html');
    }
    if (!fs.existsSync(fullPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
    }
    // Never serve dotfiles, node_modules, or server-only source over HTTP.
    const rel = path.relative(ROOT, fullPath);
    if (rel.startsWith('..') || /(^|[\\/])(\.env|node_modules|lib|scripts|api)([\\/]|$)/.test(rel)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
            if (!raw) return resolve({});
            try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const parsed = new URL(req.url, `http://${req.headers.host}`);

    if (parsed.pathname.startsWith('/api/')) {
        const match = resolveApiHandler(parsed.pathname);
        if (!match) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Not found' }));
        }

        req.body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
        req.query = Object.assign({}, match.params, Object.fromEntries(parsed.searchParams));

        // Adapt Node's raw res to the res.status().json() shape Vercel provides.
        res.status = function (code) { this.statusCode = code; return this; };
        res.json = function (obj) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(obj));
        };

        try {
            await match.handler(req, res);
        } catch (err) {
            console.error(err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
        return;
    }

    serveStatic(req, res, parsed.pathname);
});

server.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
    console.log(`  Public site: http://localhost:${PORT}/`);
    console.log(`  Admin:       http://localhost:${PORT}/admin`);
});
