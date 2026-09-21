// Cyber Ronin hero — cursor/touch spotlight reveal. The base image
// (data-spotlight-base) is always visible; a second "powered up" image
// (data-spotlight-reveal) sits on top, clipped to a radial-gradient mask
// centered on the pointer, via CSS custom properties this script writes.
// Pure position/mask updates — no layout thrash, no repeated DOM queries
// per move, rAF-throttled so it stays cheap even while scrubbing quickly.
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // CSS already hides the reveal layer entirely.

    var hero = document.getElementById('home');
    var visual = hero && hero.querySelector('[data-hero="visual"]');
    var reveal = hero && hero.querySelector('[data-spotlight-reveal]');
    if (!hero || !visual || !reveal) return;

    function radiusForViewport() {
        var w = window.innerWidth;
        if (w < 480) return 120;
        if (w < 720) return 160;
        return 260;
    }

    var radius = radiusForViewport();
    var ticking = false;
    var pendingX = null;
    var pendingY = null;

    function applySpot() {
        ticking = false;
        if (pendingX === null) return;
        reveal.style.setProperty('--spot-x', pendingX + 'px');
        reveal.style.setProperty('--spot-y', pendingY + 'px');
        reveal.style.setProperty('--spot-r', radius + 'px');
    }

    function queueSpot(clientX, clientY) {
        // Relative to the reveal layer itself (it is offset/parallaxed inside
        // the hero), so the mask stays centered under the pointer.
        var rect = reveal.getBoundingClientRect();
        pendingX = clientX - rect.left;
        pendingY = clientY - rect.top;
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(applySpot);
        }
    }

    function clearSpot() {
        reveal.style.setProperty('--spot-r', '0px');
    }

    hero.addEventListener('mousemove', function (e) {
        queueSpot(e.clientX, e.clientY);
    }, { passive: true });

    hero.addEventListener('mouseleave', clearSpot);

    hero.addEventListener('touchmove', function (e) {
        var touch = e.touches[0];
        if (!touch) return;
        queueSpot(touch.clientX, touch.clientY);
    }, { passive: true });

    hero.addEventListener('touchend', clearSpot);
    hero.addEventListener('touchcancel', clearSpot);

    window.addEventListener('resize', function () {
        radius = radiusForViewport();
    }, { passive: true });
})();
