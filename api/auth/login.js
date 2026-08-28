const { verifyPassword, createSessionCookie } = require('../../lib/auth');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!expectedUsername || !expectedHash) {
        console.error('Admin auth not configured: missing ADMIN_USERNAME or ADMIN_PASSWORD_HASH');
        return res.status(500).json({ error: 'Admin auth is not configured' });
    }

    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username !== expectedUsername || !verifyPassword(password, expectedHash)) {
        // Same generic message either way — don't reveal which field was wrong.
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.setHeader('Set-Cookie', await createSessionCookie());
    return res.status(200).json({ ok: true });
});
