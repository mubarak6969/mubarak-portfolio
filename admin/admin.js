(function () {
    'use strict';

    const API = '/api';
    let projects = [];
    let deleteTargetId = null;

    const el = (id) => document.getElementById(id);

    async function api(path, options = {}) {
        const res = await fetch(API + path, {
            credentials: 'same-origin',
            headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
            ...options
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* no body */ }
        if (!res.ok) {
            const message = (data && data.error) || `Request failed (${res.status})`;
            throw new Error(message);
        }
        return data;
    }

    function showToast(message, type = 'success') {
        const toast = el('toast');
        el('toastMessage').textContent = message;
        toast.className = 'toast active ' + type;
        toast.querySelector('i').className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        setTimeout(() => toast.classList.remove('active'), 3000);
    }

    function setView(view) {
        el('loadingView').hidden = view !== 'loading';
        el('loginView').hidden = view !== 'login';
        el('dashboardView').hidden = view !== 'dashboard';
    }

    // ---------------- Auth ----------------

    async function checkSession() {
        setView('loading');
        try {
            const { authenticated } = await api('/auth/me');
            if (authenticated) {
                renderHeaderLoggedIn();
                setView('dashboard');
                await loadProjects();
            } else {
                renderHeaderLoggedOut();
                setView('login');
            }
        } catch (err) {
            renderHeaderLoggedOut();
            setView('login');
        }
    }

    function renderHeaderLoggedIn() {
        el('headerActions').innerHTML = '<button class="btn-secondary" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>';
        el('logoutBtn').addEventListener('click', handleLogout);
    }

    function renderHeaderLoggedOut() {
        el('headerActions').innerHTML = '';
    }

    async function handleLogin(e) {
        e.preventDefault();
        const submitBtn = el('loginSubmit');
        const errorBox = el('loginError');
        errorBox.hidden = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';

        try {
            await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: el('loginUsername').value,
                    password: el('loginPassword').value
                })
            });
            el('loginForm').reset();
            await checkSession();
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.hidden = false;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in';
        }
    }

    async function handleLogout() {
        try {
            await api('/auth/logout', { method: 'POST' });
        } catch (err) { /* proceed to login view regardless */ }
        await checkSession();
    }

    // ---------------- Project list ----------------

    async function loadProjects() {
        const data = await api('/projects');
        projects = data.projects.sort((a, b) => a.displayOrder - b.displayOrder);
        renderProjectList();
    }

    function renderProjectList() {
        const list = el('projectList');
        const empty = el('dashboardEmpty');

        if (!projects.length) {
            list.innerHTML = '';
            empty.hidden = false;
            return;
        }
        empty.hidden = true;

        list.innerHTML = projects.map((p, index) => `
            <div class="admin-project-row" data-id="${p.id}">
                <div class="admin-project-icon"><i class="fas ${escapeAttr(p.icon || 'fa-code')}"></i></div>
                <div class="admin-project-info">
                    <h3>${escapeHtml(p.title)}</h3>
                    <div class="admin-project-meta">
                        <span class="admin-tag ${p.published ? 'is-on' : 'is-off'}">${p.published ? 'Published' : 'Draft'}</span>
                        <span class="admin-tag ${p.featured ? 'is-on' : 'is-off'}">${p.featured ? 'Featured' : 'Not featured'}</span>
                        <span>${escapeHtml(p.category || '')}</span>
                    </div>
                </div>
                <div class="admin-project-actions">
                    <button class="admin-icon-btn" data-action="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up"><i class="fas fa-arrow-up"></i></button>
                    <button class="admin-icon-btn" data-action="down" ${index === projects.length - 1 ? 'disabled' : ''} aria-label="Move down"><i class="fas fa-arrow-down"></i></button>
                    <button class="admin-icon-btn" data-action="publish" aria-label="Toggle published"><i class="fas ${p.published ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                    <button class="admin-icon-btn" data-action="feature" aria-label="Toggle featured"><i class="fas fa-star"></i></button>
                    <button class="admin-icon-btn" data-action="edit" aria-label="Edit"><i class="fas fa-edit"></i></button>
                    <button class="admin-icon-btn is-danger" data-action="delete" aria-label="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
    function escapeAttr(str) {
        return String(str).replace(/[^a-zA-Z0-9-_]/g, '');
    }

    el('projectList').addEventListener('click', async (e) => {
        const btn = e.target.closest('.admin-icon-btn');
        if (!btn || btn.disabled) return;
        const row = e.target.closest('.admin-project-row');
        const id = parseInt(row.dataset.id, 10);
        const project = projects.find((p) => p.id === id);
        const action = btn.dataset.action;

        try {
            if (action === 'edit') return openProjectForm(project);
            if (action === 'delete') return openDeleteConfirm(id);
            if (action === 'publish') {
                await api(`/projects/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published: !project.published }) });
                showToast(project.published ? 'Unpublished' : 'Published');
                await loadProjects();
            }
            if (action === 'feature') {
                await api(`/projects/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured: !project.featured }) });
                showToast(project.featured ? 'Removed from featured' : 'Marked as featured');
                await loadProjects();
            }
            if (action === 'up' || action === 'down') {
                await reorder(id, action);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    async function reorder(id, direction) {
        const index = projects.findIndex((p) => p.id === id);
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= projects.length) return;

        const a = projects[index];
        const b = projects[swapIndex];
        await api('/projects/reorder', {
            method: 'PATCH',
            body: JSON.stringify({ order: [{ id: a.id, displayOrder: b.displayOrder }, { id: b.id, displayOrder: a.displayOrder }] })
        });
        await loadProjects();
    }

    // ---------------- Add / edit form ----------------

    function openProjectForm(project) {
        el('projectFormError').hidden = true;
        el('projectFormTitle').textContent = project ? 'Edit project' : 'Add project';
        el('pfId').value = project ? project.id : '';
        el('pfTitle').value = project ? project.title : '';
        el('pfCategory').value = project ? project.category : '';
        el('pfDescription').value = project ? project.description : '';
        el('pfTech').value = project ? project.technologies.join(', ') : '';
        el('pfIcon').value = project ? project.icon : 'fa-code';
        el('pfGithub').value = project ? project.github : '';
        el('pfDemo').value = project ? project.demo : '';
        el('pfFeatured').checked = project ? project.featured : false;
        el('pfPublished').checked = project ? project.published : true;
        el('projectFormModal').classList.add('active');
    }

    function closeProjectForm() {
        el('projectFormModal').classList.remove('active');
    }

    el('addProjectBtn').addEventListener('click', () => openProjectForm(null));
    el('closeProjectForm').addEventListener('click', closeProjectForm);
    el('closeProjectForm').addEventListener('keydown', (e) => { if (e.key === 'Enter') closeProjectForm(); });

    el('projectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = el('projectFormSubmit');
        const errorBox = el('projectFormError');
        errorBox.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';

        const id = el('pfId').value;
        const payload = {
            title: el('pfTitle').value.trim(),
            category: el('pfCategory').value.trim(),
            description: el('pfDescription').value.trim(),
            technologies: el('pfTech').value.split(',').map((t) => t.trim()).filter(Boolean),
            icon: el('pfIcon').value,
            github: el('pfGithub').value.trim(),
            demo: el('pfDemo').value.trim(),
            featured: el('pfFeatured').checked,
            published: el('pfPublished').checked
        };

        try {
            if (id) {
                await api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Project updated');
            } else {
                await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Project added');
            }
            closeProjectForm();
            await loadProjects();
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.hidden = false;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save project';
        }
    });

    // ---------------- Delete confirmation ----------------

    function openDeleteConfirm(id) {
        deleteTargetId = id;
        el('deleteConfirmModal').classList.add('active');
    }

    el('deleteCancelBtn').addEventListener('click', () => {
        deleteTargetId = null;
        el('deleteConfirmModal').classList.remove('active');
    });

    el('deleteConfirmBtn').addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            await api(`/projects/${deleteTargetId}`, { method: 'DELETE' });
            showToast('Project deleted');
            el('deleteConfirmModal').classList.remove('active');
            deleteTargetId = null;
            await loadProjects();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Escape closes whichever modal is currently open.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal-overlay.active').forEach((overlay) => {
            overlay.classList.remove('active');
        });
    });

    // ---------------- Init ----------------

    el('loginForm').addEventListener('submit', handleLogin);
    checkSession();
})();
