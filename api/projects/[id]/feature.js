const { query } = require('../../../lib/db');
const { requireAdmin } = require('../../../lib/auth');
const { serializeProject, parseProjectId } = require('../../../lib/projects');
const { withErrorHandling } = require('../../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method !== 'PATCH') {
        res.setHeader('Allow', 'PATCH');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await requireAdmin(req, res))) return;

    const id = parseProjectId(req.query.id);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });

    const { featured } = req.body || {};
    if (typeof featured !== 'boolean') {
        return res.status(400).json({ error: '"featured" must be a boolean' });
    }

    const result = await query('UPDATE projects SET featured = $1 WHERE id = $2 RETURNING *', [featured, id]);
    if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json({ project: serializeProject(result.rows[0]) });
});
