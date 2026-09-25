// Renders a single case-study page from data/projects.js based on
// ?slug=<slug> in the URL, then wires up GSAP scroll animations and the
// prev/next project navigation. No network requests — everything here is
// local static data.
(function () {
    'use strict';

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function safeUrl(url) {
        if (typeof url !== 'string') return '';
        return /^https?:\/\//i.test(url.trim()) ? url.trim() : '';
    }

    var projects = window.PORTFOLIO_PROJECTS || [];
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    var index = projects.findIndex(function (p) { return p.slug === slug; });
    var project = index >= 0 ? projects[index] : projects[0];
    index = index >= 0 ? index : 0;

    if (!project) {
        document.getElementById('projectRoot').innerHTML = '<div class="project-section"><p class="project-section-text">Project not found. <a href="index.html#projects">Back to projects</a></p></div>';
        return;
    }

    document.title = project.title + ' | Mohammed Mubarak';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', project.tagline);

    function el(tag, className, html) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (html != null) node.innerHTML = html;
        return node;
    }

    function section(eyebrow, title) {
        var s = el('section', 'project-section');
        s.appendChild(el('div', 'project-section-eyebrow reveal', escapeHtml(eyebrow)));
        s.appendChild(el('h2', 'project-section-title reveal', escapeHtml(title)));
        return s;
    }

    var root = document.getElementById('projectRoot');

    // ---------------- Hero ----------------
    var hero = el('section', 'project-hero');
    hero.appendChild(el('div', 'project-hero-category reveal', escapeHtml(project.category)));
    hero.appendChild(el('h1', 'project-hero-title reveal', escapeHtml(project.title)));
    hero.appendChild(el('p', 'project-hero-tagline reveal', escapeHtml(project.tagline)));

    var meta = el('dl', 'project-hero-meta reveal');
    [['Role', project.role], ['Year', project.year], ['Category', project.category]].forEach(function (pair) {
        var item = el('div', 'project-hero-meta-item');
        item.appendChild(el('dt', null, escapeHtml(pair[0])));
        item.appendChild(el('dd', null, escapeHtml(pair[1])));
        meta.appendChild(item);
    });
    hero.appendChild(meta);

    var ctas = el('div', 'project-hero-ctas reveal');
    if (project.github) {
        ctas.appendChild(el('a', 'btn-primary', '<i class="fab fa-github"></i> View GitHub'));
        ctas.lastChild.href = safeUrl(project.github);
        ctas.lastChild.target = '_blank';
    }
    if (project.demo) {
        ctas.appendChild(el('a', 'btn-secondary', '<i class="fas fa-external-link-alt"></i> Live Demo'));
        ctas.lastChild.href = safeUrl(project.demo);
        ctas.lastChild.target = '_blank';
    }
    if (project.docs) {
        ctas.appendChild(el('a', 'btn-secondary', '<i class="fas fa-book"></i> Documentation'));
        ctas.lastChild.href = safeUrl(project.docs);
        ctas.lastChild.target = '_blank';
    }
    hero.appendChild(ctas);

    if (project.status) {
        var banner = el('div', 'project-status-banner reveal', '<i class="fas fa-circle-info"></i><span>' + escapeHtml(project.status) + '</span>');
        hero.appendChild(banner);
    }
    root.appendChild(hero);

    // ---------------- Overview / Problem / Solution ----------------
    var overviewSection = section('Overview', 'What Is This Project?');
    var twoCol = el('div', 'project-two-col');
    var overviewCol = el('div');
    overviewCol.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.overview)));
    twoCol.appendChild(overviewCol);

    var problemCol = el('div');
    problemCol.appendChild(el('h3', 'reveal', 'The Problem'));
    problemCol.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.problem)));
    twoCol.appendChild(problemCol);
    overviewSection.appendChild(twoCol);

    var solutionWrap = el('div');
    solutionWrap.style.marginTop = '40px';
    solutionWrap.appendChild(el('h3', 'reveal', 'The Solution'));
    solutionWrap.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.solution)));
    overviewSection.appendChild(solutionWrap);
    root.appendChild(overviewSection);

    // ---------------- Metrics ----------------
    if (project.metrics && project.metrics.length) {
        var metricsSection = section('Results At A Glance', 'By The Numbers');
        var metricsGrid = el('div', 'project-metrics-grid');
        project.metrics.forEach(function (m) {
            var card = el('div', 'glass-card project-metric-card reveal');
            var valueEl = el('div', 'project-metric-value');
            valueEl.setAttribute('data-count', m.value);
            valueEl.setAttribute('data-suffix', m.suffix || '');
            if (m.decimals) valueEl.setAttribute('data-decimals', m.decimals);
            valueEl.textContent = '0' + (m.suffix || '');
            card.appendChild(valueEl);
            card.appendChild(el('div', 'project-metric-label', escapeHtml(m.label)));
            metricsGrid.appendChild(card);
        });
        metricsSection.appendChild(metricsGrid);
        root.appendChild(metricsSection);
    }

    // ---------------- My Role ----------------
    var roleSection = section('My Role', 'What I Built');
    roleSection.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.role)));
    root.appendChild(roleSection);

    // ---------------- Tech Stack ----------------
    var stackSection = section('Technology Stack', 'Built With');
    var stackGrid = el('div', 'project-stack-grid');
    var stackLabels = { languages: 'Languages', frontend: 'Frontend', backend: 'Backend', database: 'Database', aiml: 'AI / ML', tools: 'Tools', deployment: 'Deployment' };
    Object.keys(stackLabels).forEach(function (key) {
        var items = project.techStack && project.techStack[key];
        if (!items || !items.length) return;
        var group = el('div', 'project-stack-group reveal');
        group.appendChild(el('h4', null, stackLabels[key]));
        var tags = el('div', 'project-stack-tags');
        items.forEach(function (t) {
            tags.appendChild(el('span', 'project-stack-tag', escapeHtml(t)));
        });
        group.appendChild(tags);
        stackGrid.appendChild(group);
    });
    stackSection.appendChild(stackGrid);
    root.appendChild(stackSection);

    // ---------------- Architecture ----------------
    if (project.architecture && project.architecture.stages && project.architecture.stages.length) {
        var archSection = section('System Architecture', 'How It’s Structured');
        var flow = el('div', 'project-flow');
        project.architecture.stages.forEach(function (stage, i) {
            var row = el('div', 'project-flow-stage reveal');
            var idx = el('div', 'project-flow-index', String(i + 1));
            var text = el('div', 'project-flow-text', escapeHtml(stage));
            row.appendChild(idx);
            row.appendChild(text);
            flow.appendChild(row);
        });
        archSection.appendChild(flow);
        if (project.architecture.note) {
            archSection.appendChild(el('div', 'project-flow-note reveal', escapeHtml(project.architecture.note)));
        }
        root.appendChild(archSection);
    }

    // ---------------- How It Works ----------------
    if (project.workflow && project.workflow.length) {
        var flowSection = section('How It Works', 'Step By Step');
        var stepsGrid = el('div', 'project-steps-grid');
        project.workflow.forEach(function (step) {
            var card = el('div', 'glass-card project-step-card reveal');
            card.appendChild(el('div', 'project-step-num', 'STEP ' + escapeHtml(step.step)));
            card.appendChild(el('div', 'project-step-text', escapeHtml(step.text)));
            stepsGrid.appendChild(card);
        });
        flowSection.appendChild(stepsGrid);
        root.appendChild(flowSection);
    }

    // ---------------- Technical Implementation ----------------
    if (project.implementation && project.implementation.length) {
        var implSection = section('Technical Implementation', 'The Important Details');
        project.implementation.forEach(function (item) {
            var card = el('div', 'project-impl-card reveal');
            card.appendChild(el('h4', null, escapeHtml(item.title)));
            card.appendChild(el('p', null, escapeHtml(item.detail)));
            if (item.code) {
                card.appendChild(el('pre', 'project-code', escapeHtml(item.code)));
            }
            implSection.appendChild(card);
        });
        root.appendChild(implSection);
    }

    // ---------------- AI/ML Pipeline ----------------
    if (project.mlPipeline && project.mlPipeline.stages && project.mlPipeline.stages.length) {
        var mlSection = section('AI / ML Pipeline', 'From Input To Prediction');
        var mlFlow = el('div', 'project-flow');
        project.mlPipeline.stages.forEach(function (stage, i) {
            var row = el('div', 'project-flow-stage reveal');
            row.appendChild(el('div', 'project-flow-index', String(i + 1)));
            row.appendChild(el('div', 'project-flow-text', escapeHtml(stage)));
            mlFlow.appendChild(row);
        });
        mlSection.appendChild(mlFlow);
        if (project.mlPipeline.note) {
            mlSection.appendChild(el('div', 'project-flow-note reveal', escapeHtml(project.mlPipeline.note)));
        }
        root.appendChild(mlSection);
    }

    // ---------------- Database ----------------
    if (project.database) {
        var dbSection = section('Database Design', project.database.type);
        if (project.database.tables && project.database.tables.length) {
            var tablesWrap = el('div', 'project-db-tables');
            project.database.tables.forEach(function (t) {
                var card = el('div', 'glass-card project-db-table-card reveal');
                card.appendChild(el('h5', null, escapeHtml(t.name)));
                card.appendChild(el('div', 'fields', escapeHtml(t.fields)));
                card.appendChild(el('div', 'purpose', escapeHtml(t.purpose)));
                tablesWrap.appendChild(card);
            });
            dbSection.appendChild(tablesWrap);
        }
        if (project.database.note) {
            dbSection.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.database.note)));
        }
        root.appendChild(dbSection);
    }

    // ---------------- API Design ----------------
    if (project.api && project.api.length) {
        var apiSection = section('API Design', 'Endpoints');
        var table = el('table', 'project-api-table reveal');
        table.innerHTML = '<thead><tr><th>Method</th><th>Endpoint</th><th>Purpose</th></tr></thead>';
        var tbody = el('tbody');
        project.api.forEach(function (row) {
            var tr = el('tr');
            tr.innerHTML =
                '<td class="project-api-method">' + escapeHtml(row.method) + '</td>' +
                '<td class="project-api-path">' + escapeHtml(row.path) + '</td>' +
                '<td>' + escapeHtml(row.purpose) + '</td>';
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        apiSection.appendChild(table);
        root.appendChild(apiSection);
    }

    // ---------------- Important Decisions ----------------
    if (project.decisions && project.decisions.length) {
        var decSection = section('Important Technical Decisions', 'Why It Was Built This Way');
        var decGrid = el('dl', 'project-decisions-grid');
        project.decisions.forEach(function (d) {
            var row = el('div', 'glass-card project-decision-row reveal');
            row.appendChild(el('dt', null, escapeHtml(d.decision)));
            row.appendChild(el('dd', null, escapeHtml(d.why)));
            decGrid.appendChild(row);
        });
        decSection.appendChild(decGrid);
        root.appendChild(decSection);
    }

    // ---------------- Challenges ----------------
    if (project.challenges && project.challenges.length) {
        var chSection = section('Challenges', 'Real Problems, Real Fixes');
        var chGrid = el('div', 'project-challenges-grid');
        project.challenges.forEach(function (c) {
            var card = el('div', 'glass-card project-challenge-card reveal');
            card.appendChild(el('h4', null, escapeHtml(c.problem)));
            card.appendChild(el('div', 'project-challenge-field', '<strong>Cause:</strong> ' + escapeHtml(c.cause)));
            card.appendChild(el('div', 'project-challenge-field', '<strong>Solution:</strong> ' + escapeHtml(c.solution)));
            var lesson = el('div', 'project-challenge-lesson project-challenge-field', '<strong>Lesson:</strong> ' + escapeHtml(c.lesson));
            card.appendChild(lesson);
            card.appendChild(el('div', 'project-challenge-toggle', 'Click for the lesson learned →'));
            card.addEventListener('click', function () {
                card.classList.toggle('is-open');
            });
            chGrid.appendChild(card);
        });
        chSection.appendChild(chGrid);
        root.appendChild(chSection);
    }

    // ---------------- Testing ----------------
    if (project.testing && project.testing.summary) {
        var testSection = section('Testing', 'Verified, Not Assumed');
        testSection.appendChild(el('p', 'project-section-text reveal', escapeHtml(project.testing.summary)));
        root.appendChild(testSection);
    }

    // ---------------- Security ----------------
    if (project.security && project.security.length) {
        var secSection = section('Security', 'What’s Actually Implemented');
        var secList = el('ul', 'project-security-list');
        project.security.forEach(function (s) {
            secList.appendChild(el('li', 'reveal', '<i class="fas fa-shield-halved"></i><span>' + escapeHtml(s) + '</span>'));
        });
        secSection.appendChild(secList);
        root.appendChild(secSection);
    }

    // ---------------- Results ----------------
    if (project.results && project.results.length) {
        var resSection = section('Results / Outcome', 'What It Achieves');
        var resList = el('ul', 'project-results-list');
        project.results.forEach(function (r) {
            resList.appendChild(el('li', 'reveal', '<i class="fas fa-check-circle"></i><span>' + escapeHtml(r) + '</span>'));
        });
        resSection.appendChild(resList);
        root.appendChild(resSection);
    }

    // ---------------- Media ----------------
    var mediaSection = section('Project Media', 'Real Evidence');
    var hasMedia = project.media && ((project.media.images && project.media.images.length) || (project.media.videos && project.media.videos.length));
    if (hasMedia) {
        var mediaGrid = el('div', 'project-media-grid');
        (project.media.images || []).forEach(function (img) {
            var item = el('div', 'project-media-item reveal');
            var imgEl = el('img');
            imgEl.src = img.src;
            imgEl.alt = img.alt || '';
            imgEl.loading = 'lazy';
            item.appendChild(imgEl);
            if (img.caption) item.appendChild(el('div', 'project-media-caption', escapeHtml(img.caption)));
            mediaGrid.appendChild(item);
        });
        (project.media.videos || []).forEach(function (vid) {
            var item = el('div', 'project-media-item reveal');
            var videoEl = document.createElement('video');
            videoEl.src = vid.src;
            videoEl.controls = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.preload = 'none';
            if (vid.poster) videoEl.poster = vid.poster;
            item.appendChild(videoEl);
            if (vid.caption) item.appendChild(el('div', 'project-media-caption', escapeHtml(vid.caption)));
            mediaGrid.appendChild(item);
        });
        mediaSection.appendChild(mediaGrid);
    }
    if (project.media && project.media.note) {
        mediaSection.appendChild(el('div', 'project-media-empty reveal', escapeHtml(project.media.note)));
    }
    root.appendChild(mediaSection);

    // ---------------- Prev / Next ----------------
    var prevProject = projects[(index - 1 + projects.length) % projects.length];
    var nextProject = projects[(index + 1) % projects.length];
    var navFooter = el('nav', 'project-nav-footer');

    var prevLink = el('a', 'project-nav-footer-link prev');
    prevLink.href = 'project.html?slug=' + encodeURIComponent(prevProject.slug);
    prevLink.innerHTML = '<span class="project-nav-footer-label">← Previous Project</span><span class="project-nav-footer-title">' + escapeHtml(prevProject.title) + '</span>';
    navFooter.appendChild(prevLink);

    var nextLink = el('a', 'project-nav-footer-link next');
    nextLink.href = 'project.html?slug=' + encodeURIComponent(nextProject.slug);
    nextLink.innerHTML = '<span class="project-nav-footer-label">Next Project →</span><span class="project-nav-footer-title">' + escapeHtml(nextProject.title) + '</span>';
    navFooter.appendChild(nextLink);

    root.appendChild(navFooter);

    // ---------------- Animations ----------------
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGSAP = typeof window.gsap !== 'undefined';

    document.querySelectorAll('.reveal').forEach(function (elReveal) {
        elReveal.classList.add('reveal');
    });

    if (!hasGSAP || reduceMotion) {
        document.querySelectorAll('.reveal').forEach(function (r) { r.classList.add('active'); });
        document.querySelectorAll('.project-flow-stage').forEach(function (r) { r.classList.add('active'); });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.reveal').forEach(function (target) {
        ScrollTrigger.create({
            trigger: target,
            start: 'top 90%',
            once: true,
            onEnter: function () {
                target.classList.add('active');
                gsap.fromTo(target, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' });
            }
        });
    });

    gsap.utils.toArray('.project-flow').forEach(function (flow) {
        var stages = flow.querySelectorAll('.project-flow-stage');
        ScrollTrigger.create({
            trigger: flow,
            start: 'top 80%',
            once: true,
            onEnter: function () {
                gsap.to(stages, {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    stagger: 0.12,
                    ease: 'power2.out',
                    onStart: function () { stages.forEach(function (s) { s.classList.add('active'); }); }
                });
            }
        });
    });

    gsap.utils.toArray('[data-count]').forEach(function (target) {
        var value = parseFloat(target.getAttribute('data-count'));
        var suffix = target.getAttribute('data-suffix') || '';
        var decimals = parseInt(target.getAttribute('data-decimals'), 10) || 0;
        var state = { v: 0 };
        ScrollTrigger.create({
            trigger: target,
            start: 'top 90%',
            once: true,
            onEnter: function () {
                gsap.to(state, {
                    v: value,
                    duration: 1.4,
                    ease: 'power2.out',
                    onUpdate: function () { target.textContent = state.v.toFixed(decimals) + suffix; },
                    onComplete: function () { target.textContent = value.toFixed(decimals) + suffix; }
                });
            }
        });
    });
})();
