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

    const { published } = req.body || {};
    if (typeof published !== 'boolean') {
        return res.status(400).json({ error: '"published" must be a boolean' });
    }

    const result = await query('UPDATE projects SET published = ? WHERE id = ?', [published, id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
    }

    const [row] = await query('SELECT * FROM projects WHERE id = ?', [id]);
    return res.status(200).json({ project: serializeProject(row) });
});
