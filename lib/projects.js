// Shared helpers for the projects API routes.

function serializeProject(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        technologies: typeof row.technologies === 'string' ? JSON.parse(row.technologies) : row.technologies,
        icon: row.icon,
        github: row.github_url,
        demo: row.demo,
        featured: !!row.featured,
        published: !!row.published,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function parseProjectId(rawId) {
    const id = parseInt(rawId, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { serializeProject, parseProjectId };
