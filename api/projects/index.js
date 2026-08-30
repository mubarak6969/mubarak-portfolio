const { query } = require('../../lib/db');
const { isAuthenticated, requireAdmin } = require('../../lib/auth');
const { serializeProject } = require('../../lib/projects');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method === 'GET') {
        // Admins (verified server-side, not by a client flag) see everything,
        // including unpublished drafts. Everyone else sees published only.
        const admin = await isAuthenticated(req);
        const result = admin
            ? await query('SELECT * FROM projects ORDER BY display_order ASC, id ASC')
            : await query('SELECT * FROM projects WHERE published = TRUE ORDER BY display_order ASC, id ASC');
        return res.status(200).json({ projects: result.rows.map(serializeProject) });
    }

    if (req.method === 'POST') {
        if (!(await requireAdmin(req, res))) return;

        const { title, description, category, technologies, icon, github, demo, featured, published, displayOrder } = req.body || {};
        if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        const result = await query(
            `INSERT INTO projects (title, description, category, technologies, icon, github_url, demo, featured, published, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                title.trim(),
                description.trim(),
                typeof category === 'string' ? category.trim() : '',
                JSON.stringify(Array.isArray(technologies) ? technologies : []),
                typeof icon === 'string' && icon ? icon : 'fa-code',
                typeof github === 'string' ? github.trim() : '',
                typeof demo === 'string' ? demo.trim() : '',
                !!featured,
                published !== false,
                Number.isInteger(displayOrder) ? displayOrder : 0
            ]
        );

        return res.status(201).json({ project: serializeProject(result.rows[0]) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
});
