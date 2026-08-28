const { isAuthenticated } = require('../../lib/auth');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const authenticated = await isAuthenticated(req);
    return res.status(200).json({
        authenticated,
        username: authenticated ? process.env.ADMIN_USERNAME : null
    });
});
