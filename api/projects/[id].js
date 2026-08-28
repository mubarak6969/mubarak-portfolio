const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { serializeProject, parseProjectId } = require('../../lib/projects');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    const id = parseProjectId(req.query.id);
    if (!id) {
        return res.status(400).json({ error: 'Invalid project id' });
    }

    if (req.method === 'PUT') {
        if (!(await requireAdmin(req, res))) return;

        const existing = await query('SELECT * FROM projects WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const current = existing[0];
        const { title, description, category, technologies, icon, github, demo, featured, published, displayOrder } = req.body || {};
        if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        await query(
            `UPDATE projects SET
                title = ?, description = ?, category = ?, technologies = ?, icon = ?,
                github_url = ?, demo = ?, featured = ?, published = ?, display_order = ?
             WHERE id = ?`,
            [
                title.trim(),
                description.trim(),
                typeof category === 'string' ? category.trim() : current.category,
                JSON.stringify(Array.isArray(technologies) ? technologies : JSON.parse(current.technologies)),
                typeof icon === 'string' && icon ? icon : current.icon,
                typeof github === 'string' ? github.trim() : current.github_url,
                typeof demo === 'string' ? demo.trim() : current.demo,
                typeof featured === 'boolean' ? featured : !!current.featured,
                typeof published === 'boolean' ? published : !!current.published,
                Number.isInteger(displayOrder) ? displayOrder : current.display_order,
                id
            ]
        );

        const [row] = await query('SELECT * FROM projects WHERE id = ?', [id]);
        return res.status(200).json({ project: serializeProject(row) });
    }

    if (req.method === 'DELETE') {
        if (!(await requireAdmin(req, res))) return;

        const result = await query('DELETE FROM projects WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
});
