const { clearSessionCookie, invalidateSessions } = require('../../lib/auth');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Bumps the server-side session epoch so this (and every other
    // outstanding) session token is rejected immediately, then clears the
    // cookie client-side too.
    await invalidateSessions();
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
});
