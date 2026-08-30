// Exercises the real handler functions directly (no HTTP layer needed) to
// verify server-side authorization actually works: unauthenticated writes
// must be rejected, authenticated writes must succeed, and public reads
// must never include unpublished projects. Run with `npm run test:api`
// against a real database — point DATABASE_URL at your Supabase project.
require('../lib/load-env')();

const loginHandler = require('../api/auth/login');
const logoutHandler = require('../api/auth/logout');
const meHandler = require('../api/auth/me');
const projectsIndexHandler = require('../api/projects/index');
const projectByIdHandler = require('../api/projects/[id]');
const publishHandler = require('../api/projects/[id]/publish');
const featureHandler = require('../api/projects/[id]/feature');
const reorderHandler = require('../api/projects/reorder');
const { getPool } = require('../lib/db');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.error(`  ✗ ${message}`);
    }
}

function mockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        body: undefined,
        headersSent: false,
        status(code) { this.statusCode = code; return this; },
        json(obj) { this.body = obj; this.headersSent = true; return this; },
        setHeader(name, value) { this.headers[name] = value; }
    };
    return res;
}

function mockReq({ method, body, query, cookie, origin }) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (origin !== undefined) headers.origin = origin;
    headers.host = 'localhost:3000';
    return { method, body: body || {}, query: query || {}, headers, url: '/test' };
}

function extractCookie(res) {
    const raw = res.headers['Set-Cookie'];
    if (!raw) return null;
    return raw.split(';')[0]; // "portfolio_session=<token>"
}

async function run() {
    console.log('\n1. Unauthenticated writes must be rejected\n');

    let res = await callHandler(projectsIndexHandler, mockReq({ method: 'POST', body: { title: 'x', description: 'y' }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `POST /api/projects without session -> 401 (got ${res.statusCode})`);

    res = await callHandler(projectByIdHandler, mockReq({ method: 'PUT', query: { id: '1' }, body: { title: 'x', description: 'y' }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `PUT /api/projects/1 without session -> 401 (got ${res.statusCode})`);

    res = await callHandler(projectByIdHandler, mockReq({ method: 'DELETE', query: { id: '1' }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `DELETE /api/projects/1 without session -> 401 (got ${res.statusCode})`);

    res = await callHandler(publishHandler, mockReq({ method: 'PATCH', query: { id: '1' }, body: { published: false }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `PATCH publish without session -> 401 (got ${res.statusCode})`);

    res = await callHandler(featureHandler, mockReq({ method: 'PATCH', query: { id: '1' }, body: { featured: true }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `PATCH feature without session -> 401 (got ${res.statusCode})`);

    res = await callHandler(reorderHandler, mockReq({ method: 'PATCH', body: { order: [{ id: 1, displayOrder: 5 }] }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `PATCH reorder without session -> 401 (got ${res.statusCode})`);

    console.log('\n2. Login\n');

    res = await callHandler(loginHandler, mockReq({ method: 'POST', body: { username: process.env.ADMIN_USERNAME, password: 'definitely-wrong-password' }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 401, `Login with wrong password -> 401 (got ${res.statusCode})`);

    const realPassword = process.env.TEST_ADMIN_PASSWORD;
    if (!realPassword) {
        console.error('\nTEST_ADMIN_PASSWORD not set in .env — cannot test successful login. Skipping the rest.\n');
        printSummary();
        return;
    }

    res = await callHandler(loginHandler, mockReq({ method: 'POST', body: { username: process.env.ADMIN_USERNAME, password: realPassword }, origin: 'http://localhost:3000' }));
    assert(res.statusCode === 200, `Login with correct password -> 200 (got ${res.statusCode})`);
    const sessionCookie = extractCookie(res);
    assert(!!sessionCookie, 'Login response sets a session cookie');

    res = await callHandler(meHandler, mockReq({ method: 'GET', cookie: sessionCookie }));
    assert(res.body.authenticated === true, 'GET /api/auth/me reports authenticated with valid cookie');

    console.log('\n3. Authenticated writes succeed\n');

    res = await callHandler(projectsIndexHandler, mockReq({
        method: 'POST',
        cookie: sessionCookie,
        origin: 'http://localhost:3000',
        body: {
            title: '__TEST__ Temporary QA Project',
            description: 'Created by scripts/test-api.js, deleted at the end of the run.',
            category: 'Testing',
            technologies: ['Node'],
            icon: 'fa-flask',
            github: 'https://github.com/example/test',
            demo: 'Coming Soon',
            featured: false,
            published: false
        }
    }));
    assert(res.statusCode === 201, `POST /api/projects with session -> 201 (got ${res.statusCode})`);
    const created = res.body.project;
    assert(created && created.id, 'Created project has an id');

    console.log('\n4. Unpublished projects are excluded from public reads\n');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'GET' }));
    const publicIds = res.body.projects.map((p) => p.id);
    assert(!publicIds.includes(created.id), 'Public GET (no session) does not include the unpublished test project');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'GET', cookie: sessionCookie }));
    const adminIds = res.body.projects.map((p) => p.id);
    assert(adminIds.includes(created.id), 'Admin GET (with session) includes the unpublished test project');

    console.log('\n5. Publish / feature / edit / reorder\n');

    res = await callHandler(publishHandler, mockReq({ method: 'PATCH', cookie: sessionCookie, origin: 'http://localhost:3000', query: { id: String(created.id) }, body: { published: true } }));
    assert(res.statusCode === 200 && res.body.project.published === true, 'PATCH publish -> project now published');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'GET' }));
    assert(res.body.projects.map((p) => p.id).includes(created.id), 'Public GET now includes the project after publishing');

    res = await callHandler(featureHandler, mockReq({ method: 'PATCH', cookie: sessionCookie, origin: 'http://localhost:3000', query: { id: String(created.id) }, body: { featured: true } }));
    assert(res.statusCode === 200 && res.body.project.featured === true, 'PATCH feature -> project now featured');

    res = await callHandler(projectByIdHandler, mockReq({
        method: 'PUT',
        cookie: sessionCookie,
        origin: 'http://localhost:3000',
        query: { id: String(created.id) },
        body: { title: '__TEST__ Edited Title', description: 'edited', category: 'Testing', technologies: ['Node'], icon: 'fa-flask', github: '', demo: '', featured: true, published: true }
    }));
    assert(res.statusCode === 200 && res.body.project.title === '__TEST__ Edited Title', 'PUT edit -> title updated');

    res = await callHandler(reorderHandler, mockReq({ method: 'PATCH', cookie: sessionCookie, origin: 'http://localhost:3000', body: { order: [{ id: created.id, displayOrder: 99 }] } }));
    assert(res.statusCode === 200, 'PATCH reorder -> 200');

    console.log('\n6. Cross-site origin is rejected even with a valid cookie\n');

    res = await callHandler(projectByIdHandler, mockReq({ method: 'DELETE', cookie: sessionCookie, origin: 'https://evil.example.com', query: { id: String(created.id) } }));
    assert(res.statusCode === 403, `DELETE from a foreign Origin -> 403 (got ${res.statusCode})`);

    console.log('\n7. Delete (cleanup)\n');

    res = await callHandler(projectByIdHandler, mockReq({ method: 'DELETE', cookie: sessionCookie, origin: 'http://localhost:3000', query: { id: String(created.id) } }));
    assert(res.statusCode === 200, 'DELETE with session -> 200');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'GET', cookie: sessionCookie }));
    assert(!res.body.projects.map((p) => p.id).includes(created.id), 'Test project no longer exists after delete');

    console.log('\n8. Logout invalidates the session\n');

    res = await callHandler(logoutHandler, mockReq({ method: 'POST' }));
    assert(res.statusCode === 200, 'Logout -> 200');
    const clearedCookieHeader = res.headers['Set-Cookie'];
    assert(clearedCookieHeader && clearedCookieHeader.includes('Max-Age=0'), 'Logout clears the cookie (Max-Age=0)');

    res = await callHandler(meHandler, mockReq({ method: 'GET', cookie: sessionCookie }));
    assert(res.body.authenticated === false, 'The pre-logout cookie is rejected after logout (server-side session epoch bumped, not just cookie cleared)');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'POST', cookie: sessionCookie, origin: 'http://localhost:3000', body: { title: 'x', description: 'y' } }));
    assert(res.statusCode === 401, `A write with the old (pre-logout) cookie -> 401 (got ${res.statusCode})`);

    console.log('\n9. Existing seeded projects survived the whole run\n');

    res = await callHandler(projectsIndexHandler, mockReq({ method: 'GET' }));
    const titles = res.body.projects.map((p) => p.title);
    assert(titles.includes('ECG Peak Detection using Deep Learning'), 'ECG project still present');
    assert(titles.includes('Facial Recognition Attendance System'), 'Facial recognition project still present');

    printSummary();
}

async function callHandler(handler, req) {
    const res = mockRes();
    await handler(req, res);
    return res;
}

function printSummary() {
    console.log(`\n${passed} passed, ${failed} failed\n`);
}

run()
    .catch((err) => {
        console.error('Test run crashed:', err);
        failed++;
        printSummary();
        process.exitCode = 1;
    })
    .finally(async () => {
        try { await getPool().end(); } catch (e) { /* pool may not have been created */ }
        if (failed > 0) process.exitCode = 1;
    });
