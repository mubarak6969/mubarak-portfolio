// Initialize particles
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}
createParticles();

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// Modal functions
function openModal(type) {
    document.getElementById(type + 'Modal').classList.add('active');
}

function closeModal(type) {
    document.getElementById(type + 'Modal').classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast.querySelector('i');

    toastMessage.textContent = message;
    toast.className = 'toast active ' + type;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// SECRET ADMIN ACCESS
const ADMIN_PASSWORD = "Mubarak@2025";

function secretAdminLogin() {
    const password = prompt("Enter Admin Password:");
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('portfolio_admin_active', 'true');
        enableAdminMode();
        showToast('Welcome back, Admin!', 'success');
    } else if (password !== null) {
        showToast('Incorrect password!', 'error');
    }
}

function enableAdminMode() {
    document.getElementById('userBadge').classList.add('active');
    document.getElementById('adminPanel').classList.add('active');
    renderProjects();
}

function logout() {
    localStorage.removeItem('portfolio_admin_active');
    document.getElementById('userBadge').classList.remove('active');
    document.getElementById('adminPanel').classList.remove('active');
    editMode = false;
    renderProjects();
    showToast('Logged out successfully!');
}

// Check if admin is already logged in
function checkAuth() {
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    if (isAdmin) {
        enableAdminMode();
    }
}
checkAuth();

// Project management
let editMode = false;

const defaultProjects = [
    {
        id: 1,
        title: 'ECG Peak Detection using Deep Learning',
        category: 'Healthcare AI',
        description: 'End-to-end deep learning system to detect R-peaks and classify ECG signals as Normal or Abnormal, achieving 92% accuracy on PTB-XL dataset. Features real-time web apps via Streamlit and Flask.',
        technologies: ['Python', 'TensorFlow', 'Keras', 'Streamlit', 'Flask'],
        icon: 'fa-heartbeat',
        github: 'https://github.com/mubarak6969/ECG_DETECTION',
        demo: 'Coming Soon'
    },
    {
        id: 2,
        title: 'Facial Recognition Attendance System',
        category: 'Computer Vision',
        description: 'Real-time facial recognition system using Python, OpenCV, and computer vision techniques to automate attendance capture from live webcam input with Flask REST API and MySQL.',
        technologies: ['Python', 'Flask', 'OpenCV', 'MySQL', 'REST APIs'],
        icon: 'fa-eye',
        github: 'https://github.com/mubarak6969/Adavance_Attendance_System',
        demo: 'Coming Soon'
    }
];

function getProjects() {
    const stored = localStorage.getItem('portfolio_projects');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('portfolio_projects', JSON.stringify(defaultProjects));
    return defaultProjects;
}

function saveProjects(projects) {
    localStorage.setItem('portfolio_projects', JSON.stringify(projects));
}

function renderProjects() {
    const projects = getProjects();
    const grid = document.getElementById('projectsGrid');
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    
    grid.innerHTML = projects.map(project => `
        <div class="glass-card project-card reveal active">
            ${editMode && isAdmin ? `
                <div class="project-actions">
                    <div class="project-edit" onclick="openEditModal(${project.id})">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="project-delete" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
            ` : ''}
            <div class="project-image">
                <i class="fas ${project.icon}"></i>
            </div>
            <div class="project-tags">
                ${project.technologies.map(tech => `<span class="project-tag">${tech}</span>`).join('')}
            </div>
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="project-links">
                ${project.github ? `<a href="${project.github}" target="_blank"><i class="fab fa-github"></i> Code</a>` : ''}
                ${project.demo ? `<a href="${project.demo.startsWith('http') ? project.demo : '#'}" target="_blank"><i class="fas fa-external-link-alt"></i> ${project.demo}</a>` : ''}
            </div>
        </div>
    `).join('');
}

function handleAddProject(e) {
    e.preventDefault();
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    
    if (!isAdmin) {
        showToast('Admin access required!', 'error');
        return;
    }

    const project = {
        id: Date.now(),
        title: document.getElementById('projTitle').value,
        category: document.getElementById('projCategory').value,
        description: document.getElementById('projDesc').value,
        technologies: document.getElementById('projTech').value.split(',').map(t => t.trim()),
        icon: document.getElementById('projIcon').value,
        github: document.getElementById('projGithub').value,
        demo: document.getElementById('projDemo').value || null
    };

    const projects = getProjects();
    projects.push(project);
    saveProjects(projects);
    renderProjects();
    closeModal('project');
    showToast('Project added successfully!');
    e.target.reset();
}

function openEditModal(id) {
    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('editProjId').value = project.id;
    document.getElementById('editProjTitle').value = project.title;
    document.getElementById('editProjCategory').value = project.category;
    document.getElementById('editProjDesc').value = project.description;
    document.getElementById('editProjTech').value = project.technologies.join(', ');
    document.getElementById('editProjGithub').value = project.github || '';
    document.getElementById('editProjDemo').value = project.demo || '';
    document.getElementById('editProjIcon').value = project.icon;

    openModal('editProject');
}

function handleEditProject(e) {
    e.preventDefault();
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    
    if (!isAdmin) {
        showToast('Admin access required!', 'error');
        return;
    }

    const id = parseInt(document.getElementById('editProjId').value);
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return;

    projects[index] = {
        ...projects[index],
        title: document.getElementById('editProjTitle').value,
        category: document.getElementById('editProjCategory').value,
        description: document.getElementById('editProjDesc').value,
        technologies: document.getElementById('editProjTech').value.split(',').map(t => t.trim()),
        icon: document.getElementById('editProjIcon').value,
        github: document.getElementById('editProjGithub').value,
        demo: document.getElementById('editProjDemo').value || null
    };

    saveProjects(projects);
    renderProjects();
    closeModal('editProject');
    showToast('Project updated successfully!');
}

function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    
    if (!isAdmin) {
        showToast('Admin access required!', 'error');
        return;
    }

    const projects = getProjects().filter(p => p.id !== id);
    saveProjects(projects);
    renderProjects();
    showToast('Project deleted!');
}

function toggleEditMode() {
    const isAdmin = localStorage.getItem('portfolio_admin_active') === 'true';
    
    if (!isAdmin) {
        showToast('Admin access required!', 'error');
        return;
    }

    editMode = !editMode;
    document.getElementById('editModeText').textContent = editMode ? 'Disable Edit Mode' : 'Enable Edit Mode';
    renderProjects();
    showToast(editMode ? 'Edit mode enabled' : 'Edit mode disabled');
    document.getElementById('adminMenu').classList.remove('active');
}

function toggleAdminMenu() {
    document.getElementById('adminMenu').classList.toggle('active');
}

// Close admin menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.admin-panel')) {
        document.getElementById('adminMenu').classList.remove('active');
    }
});

// ==========================================
// FIXED WHATSAPP CONTACT FORM HANDLER
// ==========================================
function handleWhatsAppContact(e) {
    e.preventDefault(); // Prevents the page from refreshing

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;

    const whatsappNumber = '917569319827';

    // Format the message with WhatsApp markdown (bolding with asterisks)
    const text = `*Hello Mohammed Mubarak,*\n\nI am reaching out from your portfolio website.\n\n*Name:* ${name}\n*Email:* ${email}\n*Subject:* ${subject}\n\n*Message:*\n${message}`;

    // Encode the text properly so it doesn't break the URL
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

    // USE window.location.href INSTEAD OF window.open TO BYPASS POPUP BLOCKERS
    window.location.href = whatsappURL;

    showToast('Opening WhatsApp...', 'success');
    e.target.reset(); // Clears the form after sending
}

// Scroll reveal animation
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const revealPoint = 150;

        if (elementTop < windowHeight - revealPoint) {
            el.classList.add('active');
        }
    });
}

window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

// Initial render
renderProjects();