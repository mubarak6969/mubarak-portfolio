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
// Rendered from the local static data in data/projects.js — no backend,
// no database, no API call. See that file for the source of truth.
// ==========================================
// Escapes text content before it lands in innerHTML. Kept even though the
// project data is local/static, as defense-in-depth and so this function
// behaves identically to how it always has.
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

// The whole card is clickable (opens the case study), but it also contains
// real <a> links (GitHub/Demo) — an <a> cannot legally contain another <a>,
// so the card itself is a div[role="button"] with a click/keydown handler,
// the same pattern used elsewhere in this codebase for a clickable card
// that must contain real links.
function renderProjectCards(projects) {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = projects.map(project => {
        const githubUrl = safeUrl(project.github);
        const demoUrl = safeUrl(project.demo);
        const caseStudyUrl = `project.html?slug=${encodeURIComponent(project.slug)}`;
        const coverImg = project.cover
            ? `<img class="project-card-cover" src="${escapeAttr(project.cover)}" alt="" loading="lazy">`
            : `<i class="fas ${escapeAttr(project.icon || 'fa-code')}"></i>`;
        return `
        <div class="glass-card project-card reveal" role="button" tabindex="0" data-href="${escapeAttr(caseStudyUrl)}" aria-label="Read the ${escapeAttr(project.title)} case study">
            <div class="project-image${project.cover ? ' has-cover' : ''}">
                ${coverImg}
            </div>
            <div class="project-tags">
                <span class="project-tag">${escapeHtml(project.category)}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.tagline)}</p>
            <div class="project-links">
                <a href="${escapeAttr(caseStudyUrl)}"><i class="fas fa-book-open"></i> Read case study</a>
                ${githubUrl ? `<a href="${escapeAttr(githubUrl)}" target="_blank"><i class="fab fa-github"></i> Code</a>` : ''}
                ${demoUrl ? `<a href="${escapeAttr(demoUrl)}" target="_blank"><i class="fas fa-external-link-alt"></i> Demo</a>` : ''}
            </div>
        </div>
    `;
    }).join('');
}

// Clicking anywhere on a project card navigates to its case study, unless
// the click landed on one of the card's own real links (which handle
// themselves natively).
document.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card || e.target.closest('a')) return;
    const href = card.dataset.href;
    if (href) window.location.href = href;
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest && e.target.closest('.project-card');
    if (!card || e.target.closest('a')) return;
    e.preventDefault();
    const href = card.dataset.href;
    if (href) window.location.href = href;
});

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    const projects = window.PORTFOLIO_PROJECTS || [];

    if (!projects.length) {
        grid.innerHTML = '<p class="projects-empty">Projects are coming soon — check back shortly.</p>';
    } else {
        renderProjectCards(projects);
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

// ==========================================
// AMBIENT PERSONAL VIDEO LOOPS
// Lazily loads and plays the background video loops only while they're
// actually in the viewport, and only on wider viewports — narrow/mobile
// screens keep the static fallback image instead (CSS also hides <video>
// there), to protect mobile performance and data usage.
// ==========================================
function initAmbientVideos() {
    const isNarrowViewport = window.matchMedia('(max-width: 768px)').matches;
    if (isNarrowViewport) return;

    const videos = document.querySelectorAll('.media-band-video, .contact-video');
    if (!videos.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
                if (!video.getAttribute('src') && video.dataset.src) {
                    video.setAttribute('src', video.dataset.src);
                }
                const playPromise = video.play();
                if (playPromise && playPromise.then) {
                    playPromise.then(() => video.classList.add('is-playing')).catch(() => {});
                }
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    videos.forEach((video) => observer.observe(video));
}

// Initial render
renderProjects();
initAmbientVideos();
