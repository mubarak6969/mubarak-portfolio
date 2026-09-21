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
    // Hero entrance choreography — Cyber Ronin cinematic reveal.
    // Image: scale(1.18) -> scale(1), opacity 0 -> 1.
    // Headline lines: translateY(20px) -> 0, opacity 0 -> 1, ~0.1s stagger.
    // Supporting elements (copy/controls/card/specs): opacity + translateY(14px)
    // + blur(8px) -> blur(0), staggered.
    // ---------------------------------------------------------------
    function playHeroTimeline() {
        var navbar = document.getElementById('navbar');
        var visual = document.querySelector('[data-hero="visual"]');
        var lines = document.querySelectorAll('.hero-title .line-inner');
        var kicker = document.querySelector('[data-hero="kicker"]');
        var copy = document.querySelector('[data-hero="copy"]');
        var controls = document.querySelector('[data-hero="controls"]');
        var product = document.querySelector('[data-hero="product"]');
        var specs = document.querySelector('[data-hero="specs"]');
        var frameCounter = document.querySelector('.hero-frame-counter');
        var supporting = [kicker, controls, product, specs, frameCounter].filter(Boolean);

        if (reduceMotion) return; // elements are already visible via base CSS.

        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        gsap.set(lines, { y: 20, opacity: 0 });
        gsap.set(kicker, { y: 14, opacity: 0, filter: 'blur(8px)' });
        gsap.set(copy, { y: 14, opacity: 0, filter: 'blur(8px)' });
        gsap.set(supporting, { y: 14, opacity: 0, filter: 'blur(8px)' });
        gsap.set(visual, { opacity: 0, scale: 1.18 });
        if (navbar) gsap.set(navbar, { y: -20, opacity: 0 });

        tl.to(visual, { opacity: 1, scale: 1, duration: 1.6, ease: 'power2.out' }, 0)
          .to(navbar, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.1)
          .to(kicker, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6 }, 0.35)
          .to(lines, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0.45)
          .to(copy, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7 }, 0.85)
          .to(controls, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.06 }, 0.95)
          .to(product, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7 }, 1.05)
          .to(specs, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7 }, 1.0)
          .to(frameCounter, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6 }, 0.6);
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
                // Each element enters from its own direction (data-dir), so
                // left/right columns slide in toward each other instead of
                // every block doing the same upward fade.
                // fromTo with explicit endpoints — a plain gsap.from() would
                // sample the mid-CSS-transition computed style as its target.
                batch.forEach(function (el, i) {
                    var dir = el.getAttribute('data-dir');
                    var from = { y: 24, x: 0, opacity: 0 };
                    if (dir === 'left') from = { y: 0, x: -60, opacity: 0 };
                    if (dir === 'right') from = { y: 0, x: 60, opacity: 0 };
                    gsap.fromTo(el, from, {
                        x: 0,
                        y: 0,
                        opacity: 1,
                        duration: 0.9,
                        ease: 'power3.out',
                        delay: i * 0.08,
                        overwrite: true,
                        clearProps: 'transform'
                    });
                });
            },
            once: true
        });
    }

    // ---------------------------------------------------------------
    // Scroll progress bar across the top of the page.
    // ---------------------------------------------------------------
    function initScrollProgress() {
        if (reduceMotion) return;
        var bar = document.createElement('div');
        bar.className = 'scroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
        gsap.to(bar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
        });
    }

    // ---------------------------------------------------------------
    // Hero parallax: the cinematic image drifts slower than the page and
    // the hero copy fades/lifts as you scroll away (scrubbed, not looped).
    // ---------------------------------------------------------------
    function initHeroParallax() {
        if (reduceMotion) return;
        var visual = document.querySelector('[data-hero="visual"]');
        var content = document.querySelector('.hero-content');
        if (!visual || !content) return;
        var st = { trigger: '#home', start: 'top top', end: 'bottom top', scrub: true };
        gsap.to(visual, { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: st });
        gsap.to(content, { y: -60, opacity: 0.15, ease: 'none', scrollTrigger: {
            trigger: '#home', start: '55% top', end: 'bottom top', scrub: true
        } });
    }

    // ---------------------------------------------------------------
    // Count-up for numeric stats (data-count / data-suffix).
    // ---------------------------------------------------------------
    function initCountUp() {
        var nums = gsap.utils.toArray('[data-count]');
        if (!nums.length || reduceMotion) return;
        nums.forEach(function (el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var suffix = el.getAttribute('data-suffix') || '';
            var state = { v: 0 };
            el.textContent = '0' + suffix;
            ScrollTrigger.create({
                trigger: el,
                start: 'top 90%',
                once: true,
                onEnter: function () {
                    gsap.to(state, {
                        v: target,
                        duration: 1.6,
                        ease: 'power2.out',
                        onUpdate: function () { el.textContent = Math.round(state.v) + suffix; },
                        onComplete: function () { el.textContent = target + suffix; }
                    });
                }
            });
        });
    }

    // ---------------------------------------------------------------
    // Staggered pop-in for skill cards and experience bullet lists.
    // ---------------------------------------------------------------
    function initStaggers() {
        if (reduceMotion) return;
        var groups = [
            { sel: '.skills-grid', child: '.skill-card', from: { y: 30, scale: 0.92, opacity: 0 } },
            { sel: '.services-grid', child: '.service-card', from: { y: 40, opacity: 0 } }
        ];
        groups.forEach(function (g) {
            var container = document.querySelector(g.sel);
            if (!container) return;
            var kids = container.querySelectorAll(g.child);
            // The parent .reveal already fades in; stagger only the children.
            gsap.set(kids, g.from);
            ScrollTrigger.create({
                trigger: container,
                start: 'top 85%',
                once: true,
                onEnter: function () {
                    gsap.to(kids, {
                        y: 0, scale: 1, opacity: 1,
                        duration: 0.7, ease: 'back.out(1.4)', stagger: 0.09,
                        clearProps: 'transform,opacity'
                    });
                }
            });
        });

        gsap.utils.toArray('.experience-list').forEach(function (list) {
            var items = list.querySelectorAll('li');
            gsap.set(items, { x: -20, opacity: 0 });
            ScrollTrigger.create({
                trigger: list,
                start: 'top 90%',
                once: true,
                onEnter: function () {
                    gsap.to(items, { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.12, clearProps: 'transform,opacity' });
                }
            });
        });
    }

    // ---------------------------------------------------------------
    // Active nav-link tracking while scrolling
    // ---------------------------------------------------------------
    function initNavTracking() {
        var sections = ['home', 'about', 'experience', 'projects', 'services', 'contact'];
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
        initScrollProgress();
        initHeroParallax();
        initCountUp();
        initStaggers();
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
