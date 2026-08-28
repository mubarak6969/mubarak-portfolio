// Initialize particles
function createParticles() {
    const container = document.getElementById('particles');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const count = window.innerWidth < 768 ? 12 : 30;
    for (let i = 0; i < count; i++) {
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
    const navLinks = document.getElementById('navLinks');
    const isOpen = navLinks.classList.toggle('active');
    const hamburger = document.getElementById('hamburger');
    if (hamburger) hamburger.setAttribute('aria-expanded', String(isOpen));
}

// Close mobile menu after navigating to a section
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const navLinks = document.getElementById('navLinks');
        const hamburger = document.getElementById('hamburger');
        if (navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
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

// ==========================================
// PUBLIC PROJECTS
// Loaded from the database via /api/projects — the server is the only
// authority on what's published; there is no client-side project storage
// or admin control on this page. Project management lives at /admin.
// ==========================================
// Escapes text content before it lands in innerHTML. Project data only ever
// comes from the single authenticated admin, but escaping here means even a
// compromised admin session can't turn a project field into stored XSS
// served to every visitor.
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
// HTML-attribute-safe escaping (encodes quotes/angle-brackets without
// mangling legitimate URL characters like ?, =, & in query strings).
function escapeAttr(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Only allow http(s) links through — blocks a javascript:/data: URI from
// ever landing in an href, regardless of where the URL value came from.
function safeUrl(url) {
    if (typeof url !== 'string') return '';
    return /^https?:\/\//i.test(url.trim()) ? url.trim() : '';
}

function renderProjectCards(projects) {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = projects.map(project => {
        const githubUrl = safeUrl(project.github);
        const demoUrl = safeUrl(project.demo);
        return `
        <div class="glass-card project-card reveal">
            <div class="project-image">
                <i class="fas ${escapeAttr(project.icon)}"></i>
            </div>
            <div class="project-tags">
                ${project.technologies.map(tech => `<span class="project-tag">${escapeHtml(tech)}</span>`).join('')}
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            <div class="project-links">
                ${githubUrl ? `<a href="${escapeAttr(githubUrl)}" target="_blank"><i class="fab fa-github"></i> Code</a>` : ''}
                ${project.demo ? `<a href="${demoUrl || '#'}" target="_blank"><i class="fas fa-external-link-alt"></i> ${escapeHtml(project.demo)}</a>` : ''}
            </div>
        </div>
    `;
    }).join('');
}

async function renderProjects() {
    const grid = document.getElementById('projectsGrid');

    // Only show the loading treatment if the request is actually slow —
    // avoids a flash of spinner on a fast connection.
    const loadingTimer = setTimeout(() => {
        grid.innerHTML = '<div class="projects-loading"><div class="projects-spinner"></div></div>';
    }, 200);

    try {
        const res = await fetch('/api/projects');
        clearTimeout(loadingTimer);
        if (!res.ok) throw new Error('Request failed');

        const data = await res.json();
        const projects = data.projects || [];

        if (!projects.length) {
            grid.innerHTML = '<p class="projects-empty">Projects are coming soon — check back shortly.</p>';
        } else {
            renderProjectCards(projects);
        }
    } catch (err) {
        clearTimeout(loadingTimer);
        grid.innerHTML = '<p class="projects-error">Projects are temporarily unavailable. Please check back soon.</p>';
    }

    window.dispatchEvent(new CustomEvent('portfolio:projectsRendered'));
}

// ==========================================
// WHATSAPP CONTACT FORM HANDLER
// ==========================================
let contactSubmitting = false;

function handleWhatsAppContact(e) {
    e.preventDefault(); // Prevents the page from refreshing

    if (contactSubmitting) return; // guard against accidental double-submit
    contactSubmitting = true;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setTimeout(() => {
        contactSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
    }, 3000);

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

// Scroll reveal animation (fallback only — animations.js takes over with
// GSAP ScrollTrigger when it's available, for higher-quality easing/stagger)
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

if (typeof gsap === 'undefined') {
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();
}

// Initial render
renderProjects();
