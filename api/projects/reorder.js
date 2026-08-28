const { getPool } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { parseProjectId } = require('../../lib/projects');
const { withErrorHandling } = require('../../lib/handler');

module.exports = withErrorHandling(async function handler(req, res) {
    if (req.method !== 'PATCH') {
        res.setHeader('Allow', 'PATCH');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await requireAdmin(req, res))) return;

    const { order } = req.body || {};
    if (!Array.isArray(order) || !order.length) {
        return res.status(400).json({ error: '"order" must be a non-empty array of {id, displayOrder}' });
    }

    const updates = [];
    for (const entry of order) {
        const id = parseProjectId(entry.id);
        if (!id || !Number.isInteger(entry.displayOrder)) {
            return res.status(400).json({ error: 'Each entry needs a valid id and integer displayOrder' });
        }
        updates.push({ id, displayOrder: entry.displayOrder });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const { id, displayOrder } of updates) {
            await conn.execute('UPDATE projects SET display_order = ? WHERE id = ?', [displayOrder, id]);
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }

    return res.status(200).json({ ok: true });
});
