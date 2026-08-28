// ICE motion system — GSAP-driven choreography layered on top of the existing
// vanilla site. Degrades gracefully: if GSAP fails to load, or the visitor
// prefers reduced motion, content is simply shown without animation.
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var hasGSAP = typeof window.gsap !== 'undefined';

    if (!hasGSAP) return; // CSS-only fallback already renders correctly.

    gsap.registerPlugin(ScrollTrigger);

    // ---------------------------------------------------------------
    // Hero entrance choreography
    // ---------------------------------------------------------------
    function playHeroTimeline() {
        var navbar = document.getElementById('navbar');
        var lines = document.querySelectorAll('.hero-title .line-inner');
        var badge = document.querySelector('[data-hero="badge"]');
        var subtitle = document.querySelector('[data-hero="subtitle"]');
        var description = document.querySelector('[data-hero="description"]');
        var buttons = document.querySelector('[data-hero="buttons"]');
        var meta = document.querySelector('[data-hero="meta"]');
        var stats = document.querySelectorAll('[data-hero="stats"] .stat-item');
        var image = document.querySelector('[data-hero="image"]');

        if (reduceMotion) return; // elements are already visible via base CSS.

        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        gsap.set(lines, { yPercent: 110, opacity: 0 });
        gsap.set([badge, subtitle, description, buttons, meta], { y: 16, opacity: 0 });
        gsap.set(stats, { y: 12, opacity: 0 });
        gsap.set(image, { opacity: 0, scale: 0.94 });
        if (navbar) gsap.set(navbar, { y: -20, opacity: 0 });

        tl.to(navbar, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
          .to(badge, { y: 0, opacity: 1, duration: 0.5 }, 0.15)
          .to(lines, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 0.28)
          .to(subtitle, { y: 0, opacity: 1, duration: 0.55 }, 0.55)
          .to(description, { y: 0, opacity: 1, duration: 0.55 }, 0.65)
          .to(buttons, { y: 0, opacity: 1, duration: 0.55 }, 0.75)
          .to(meta, { y: 0, opacity: 1, duration: 0.5 }, 0.85)
          .to(stats, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, 0.9)
          .to(image, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, 0.35);
    }

    // ---------------------------------------------------------------
    // Section-header choreography: eyebrow -> heading -> subtitle,
    // handled separately from the generic reveal batch below so each
    // section opens with its own small sequence rather than a flat fade.
    // ---------------------------------------------------------------
    function initSectionHeaderReveals() {
        var headers = gsap.utils.toArray('.section-header');
        if (!headers.length) return;

        if (reduceMotion) {
            headers.forEach(function (h) { h.classList.add('active'); });
            return;
        }

        headers.forEach(function (header) {
            var label = header.querySelector('.section-label');
            var title = header.querySelector('.section-title');
            var subtitle = header.querySelector('.section-subtitle');

            ScrollTrigger.create({
                trigger: header,
                start: 'top 88%',
                once: true,
                onEnter: function () {
                    header.classList.add('active');
                    gsap.fromTo([label, title, subtitle],
                        { y: 20, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.6,
                            ease: 'power2.out',
                            stagger: 0.12,
                            overwrite: true,
                            clearProps: 'transform'
                        }
                    );
                }
            });
        });
    }

    // ---------------------------------------------------------------
    // Project cards: dedicated entrance choreography (case-study feel)
    // instead of the flat "already active" state they used to render with.
    // Called scroll-gated on first load, and immediately after any
    // admin add/edit/delete re-render (the admin is already looking at it).
    // ---------------------------------------------------------------
    function revealProjectCards(immediate) {
        var grid = document.getElementById('projectsGrid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.project-card');
        if (!cards.length) return;

        if (reduceMotion) {
            cards.forEach(function (c) { c.classList.add('active'); });
            return;
        }

        var run = function () {
            cards.forEach(function (c) { c.classList.add('active'); });
            gsap.fromTo(cards,
                { y: 30, opacity: 0, scale: 0.97 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.75,
                    ease: 'power3.out',
                    stagger: 0.12,
                    overwrite: true,
                    clearProps: 'transform'
                }
            );
        };

        if (immediate) {
            run();
        } else {
            ScrollTrigger.create({
                trigger: grid,
                start: 'top 88%',
                once: true,
                onEnter: run
            });
        }
    }

    // ---------------------------------------------------------------
    // Scroll-triggered reveals for everything else (upgrades the plain
    // scroll-listener fallback in script.js with staggered, eased batches).
    // Section headers and project cards are excluded — they run their own
    // dedicated choreography above.
    // ---------------------------------------------------------------
    function initScrollReveals() {
        var targets = gsap.utils.toArray('.reveal:not(.active):not(.section-header):not(.project-card)');
        if (!targets.length) return;

        if (reduceMotion) {
            targets.forEach(function (el) { el.classList.add('active'); });
            return;
        }

        ScrollTrigger.batch(targets, {
            start: 'top 88%',
            onEnter: function (batch) {
                batch.forEach(function (el) { el.classList.add('active'); });
                // fromTo with explicit endpoints — a plain gsap.from() here would
                // sample the *current* computed style as its implicit target,
                // which mid-CSS-transition (triggered by the classList.add above)
                // is still animating away from 0, so it reads back ~0 and the
                // tween ends up going nowhere. Explicit endpoints sidestep that.
                gsap.fromTo(batch,
                    { y: 24, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.7,
                        ease: 'power2.out',
                        stagger: 0.08,
                        overwrite: true,
                        clearProps: 'transform'
                    }
                );
            },
            once: true
        });
    }

    // ---------------------------------------------------------------
    // Active nav-link tracking while scrolling
    // ---------------------------------------------------------------
    function initNavTracking() {
        var sections = ['home', 'about', 'projects', 'services', 'contact'];
        sections.forEach(function (id) {
            var el = document.getElementById(id);
            var link = document.querySelector('.nav-link[data-section="' + id + '"]');
            if (!el || !link) return;

            ScrollTrigger.create({
                trigger: el,
                start: 'top center',
                end: 'bottom center',
                onToggle: function (self) {
                    if (self.isActive) {
                        document.querySelectorAll('.nav-link.active').forEach(function (a) {
                            a.classList.remove('active');
                        });
                        link.classList.add('active');
                    }
                }
            });
        });
    }

    // ---------------------------------------------------------------
    // Ambient pointer light + magnetic buttons + hero image parallax
    // Desktop, fine-pointer only — disabled on touch and reduced motion.
    // ---------------------------------------------------------------
    function initPointerInteractions() {
        if (!hasFinePointer || reduceMotion) return;

        var light = document.createElement('div');
        light.className = 'pointer-light';
        document.body.appendChild(light);

        var setX = gsap.quickSetter(light, '--px', '%');
        var setY = gsap.quickSetter(light, '--py', '%');
        var lightVisible = false;

        window.addEventListener('mousemove', function (e) {
            var px = (e.clientX / window.innerWidth) * 100;
            var py = (e.clientY / window.innerHeight) * 100;
            setX(px);
            setY(py);
            if (!lightVisible) {
                light.classList.add('active');
                lightVisible = true;
            }
        }, { passive: true });

        window.addEventListener('mouseleave', function () {
            light.classList.remove('active');
            lightVisible = false;
        });

        // Magnetic CTA buttons
        document.querySelectorAll('.magnetic').forEach(function (btn) {
            var xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
            var yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });

            btn.addEventListener('mousemove', function (e) {
                var rect = btn.getBoundingClientRect();
                var relX = e.clientX - rect.left - rect.width / 2;
                var relY = e.clientY - rect.top - rect.height / 2;
                xTo(relX * 0.25);
                yTo(relY * 0.4);
            });

            btn.addEventListener('mouseleave', function () {
                xTo(0);
                yTo(0);
            });
        });

        // Subtle hero image tilt
        var tiltEl = document.querySelector('[data-tilt]');
        if (tiltEl) {
            var rotX = gsap.quickTo(tiltEl, 'rotationX', { duration: 0.5, ease: 'power2.out' });
            var rotY = gsap.quickTo(tiltEl, 'rotationY', { duration: 0.5, ease: 'power2.out' });

            tiltEl.addEventListener('mousemove', function (e) {
                var rect = tiltEl.getBoundingClientRect();
                var relX = (e.clientX - rect.left) / rect.width - 0.5;
                var relY = (e.clientY - rect.top) / rect.height - 0.5;
                rotY(relX * 10);
                rotX(relY * -10);
            });

            tiltEl.addEventListener('mouseleave', function () {
                rotX(0);
                rotY(0);
            });
        }
    }

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------
    var projectsRevealedOnce = false;

    function init() {
        playHeroTimeline();
        initSectionHeaderReveals();
        revealProjectCards(false);
        initScrollReveals();
        initNavTracking();
        initPointerInteractions();
        projectsRevealedOnce = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Admin add/edit/delete replaces the project grid's innerHTML, which
    // destroys the cards the entrance animation ran on — re-reveal the
    // fresh set immediately (the admin is already looking at this section)
    // and refresh ScrollTrigger since section heights may have changed.
    window.addEventListener('portfolio:projectsRendered', function () {
        if (projectsRevealedOnce) revealProjectCards(true);
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
})();
