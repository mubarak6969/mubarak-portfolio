// Seeds the two existing portfolio projects (previously hardcoded as
// `defaultProjects` in script.js / localStorage) into the database.
// Idempotent: skips seeding if the table already has rows, so this is safe
// to run again without creating duplicates.
require('../lib/load-env')();
const { query, getPool } = require('../lib/db');

const existingProjects = [
    {
        title: 'ECG Peak Detection using Deep Learning',
        description: 'End-to-end deep learning system to detect R-peaks and classify ECG signals as Normal or Abnormal, achieving 92% accuracy on PTB-XL dataset. Features real-time web apps via Streamlit and Flask.',
        category: 'Healthcare AI',
        technologies: ['Python', 'TensorFlow', 'Keras', 'Streamlit', 'Flask'],
        icon: 'fa-heartbeat',
        github_url: 'https://github.com/mubarak6969/ECG_DETECTION',
        demo: 'Coming Soon',
        featured: true,
        published: true,
        display_order: 0
    },
    {
        title: 'Facial Recognition Attendance System',
        description: 'Real-time facial recognition system using Python, OpenCV, and computer vision techniques to automate attendance capture from live webcam input with Flask REST API and MySQL.',
        category: 'Computer Vision',
        technologies: ['Python', 'Flask', 'OpenCV', 'MySQL', 'REST APIs'],
        icon: 'fa-eye',
        github_url: 'https://github.com/mubarak6969/Adavance_Attendance_System',
        demo: 'Coming Soon',
        featured: true,
        published: true,
        display_order: 1
    }
];

async function seed() {
    const existing = await query('SELECT COUNT(*) AS count FROM projects');
    // Postgres returns COUNT(*) as a bigint, which node-postgres hands back
    // as a string to avoid precision loss — parse before comparing.
    const count = parseInt(existing.rows[0].count, 10);
    if (count > 0) {
        console.log(`Skipping seed — projects table already has ${count} row(s).`);
        await getPool().end();
        return;
    }

    for (const p of existingProjects) {
        await query(
            `INSERT INTO projects
                (title, description, category, technologies, icon, github_url, demo, featured, published, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [p.title, p.description, p.category, JSON.stringify(p.technologies), p.icon, p.github_url, p.demo, p.featured, p.published, p.display_order]
        );
        console.log(`Seeded: ${p.title}`);
    }

    await getPool().end();
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
