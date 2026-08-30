// Server-side authentication/authorization for the single super-admin.
// Password hashing: Node's built-in scrypt (a standard, vetted KDF — no
// custom crypto). Sessions: a signed JWT in an HttpOnly cookie, verified
// with jsonwebtoken (a standard, widely-audited library — not a homemade
// token scheme). The browser is never the authority: every protected route
// re-verifies the cookie's signature *and* current server-side session
// epoch before allowing a write.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { query } = require('./db');

const COOKIE_NAME = 'portfolio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hashHex] = stored.split(':');
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
}

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET is not set');
    return secret;
}

async function getSessionVersion() {
    const result = await query('SELECT version FROM admin_session WHERE id = 1');
    return result.rows.length ? result.rows[0].version : 0;
}

// Bumps the session epoch, immediately invalidating every previously issued
// token — this is what makes logout a real server-side revocation rather
// than just telling the browser to forget its cookie.
async function invalidateSessions() {
    await query('UPDATE admin_session SET version = version + 1 WHERE id = 1');
}

async function createSessionCookie() {
    const version = await getSessionVersion();
    const token = jwt.sign({ role: 'admin', v: version }, getSessionSecret(), { expiresIn: SESSION_TTL_SECONDS });
    return cookie.serialize(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_TTL_SECONDS
    });
}

function clearSessionCookie() {
    return cookie.serialize(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0
    });
}

// Returns true only if the request carries a validly signed, unexpired
// session cookie asserting the admin role AND matching the current
// server-side session epoch. Nothing from the client body/query is trusted.
async function isAuthenticated(req) {
    const header = req.headers.cookie;
    if (!header) return false;
    const parsed = cookie.parse(header);
    const token = parsed[COOKIE_NAME];
    if (!token) return false;
    try {
        const payload = jwt.verify(token, getSessionSecret());
        if (!payload || payload.role !== 'admin') return false;
        const currentVersion = await getSessionVersion();
        return payload.v === currentVersion;
    } catch (err) {
        return false; // expired, tampered, or wrong secret
    }
}

// Lightweight CSRF defense-in-depth alongside SameSite=Strict: state-changing
// requests must originate from the same site that served the page.
function isSameOrigin(req) {
    const host = req.headers.host;
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) return process.env.NODE_ENV !== 'production'; // allow local curl/testing
    try {
        const originHost = new URL(origin).host;
        return originHost === host;
    } catch (err) {
        return false;
    }
}

// Call at the top of any protected handler. Sends 401/403 and returns false
// if the request must be rejected; returns true if the caller may proceed.
async function requireAdmin(req, res) {
    if (!isSameOrigin(req)) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    if (!(await isAuthenticated(req))) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

module.exports = {
    COOKIE_NAME,
    hashPassword,
    verifyPassword,
    createSessionCookie,
    clearSessionCookie,
    invalidateSessions,
    isAuthenticated,
    requireAdmin
};
