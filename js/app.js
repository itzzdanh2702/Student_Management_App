/**
 * App Module — Router, Navigation, Modals, Toasts, Utilities
 */
const App = (() => {
    let currentPage = 'dashboard';
    let currentParams = {};

    // ─── Router ───────────────────────────────────────────
    const routes = {
        dashboard: () => Dashboard.render(),
        classes: () => ClassManager.render(),
        'class-detail': (params) => ClassManager.renderDetail(params.classId),
        'batch-detail': (params) => BatchManager.render(params.batchId, params.tab),
        students: () => StudentManager.renderList(),
        reports: () => ReportManager.render(),
    };

    function navigateTo(page, params = {}) {
        currentPage = page;
        currentParams = params;
        const content = document.getElementById('app-content');
        if (!content) return;
        content.style.opacity = '0';
        content.style.transform = 'translateY(12px)';
        setTimeout(() => {
            try {
                if (routes[page]) {
                    routes[page](params);
                } else {
                    content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>' + t('common.page_not_found') + '</p></div>';
                }
            } catch (e) {
                console.error('Navigation error:', e);
                content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle text-danger"></i><p>' + t('common.error_loading_page') + ': ' + e.message + '</p></div>';
            }
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 150);
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page || (page === 'class-detail' && item.dataset.page === 'classes') || (page === 'batch-detail' && item.dataset.page === 'classes') || (page === 'student-detail' && item.dataset.page === 'students'));
        });
    }

    function getCurrentPage() { return currentPage; }
    function getCurrentParams() { return currentParams; }

    // ─── Breadcrumb ───────────────────────────────────────
    function setBreadcrumb(items) {
        const bc = document.getElementById('breadcrumb');
        if (!bc) return;
        bc.innerHTML = items.map((item, i) => {
            const isLast = i === items.length - 1;
            if (isLast) {
                return `<span class="bc-current">${item.label}</span>`;
            }
            return `<a href="#" class="bc-link" onclick="App.navigateTo('${item.page || 'dashboard'}'${item.params ? ', ' + JSON.stringify(item.params).replace(/"/g, "'") : ''});return false;">${item.label}</a><i class="fas fa-chevron-right bc-sep"></i>`;
        }).join('');
    }

    // ─── Modal ────────────────────────────────────────────
    function showModal(title, bodyHtml, footerHtml = '', options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const footerEl = document.getElementById('modal-footer');
        titleEl.textContent = title;
        bodyEl.innerHTML = bodyHtml;
        footerEl.innerHTML = footerHtml;
        if (options.wide) container.classList.add('modal-wide');
        else container.classList.remove('modal-wide');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('show'), 10);
    }

    function closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('show');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    // ─── Confirm Dialog ───────────────────────────────────
    function showConfirm(message, onConfirm) {
        showModal(t('common.confirm'), `<p class="confirm-message"><i class="fas fa-exclamation-triangle text-warning"></i> ${message}</p>`,
            `<button class="btn btn-secondary" onclick="App.closeModal()">${t('common.cancel')}</button>
             <button class="btn btn-danger" id="confirm-yes-btn">${t('common.confirm')}</button>`);
        setTimeout(() => {
            const btn = document.getElementById('confirm-yes-btn');
            if (btn) btn.onclick = () => { closeModal(); onConfirm(); };
        }, 50);
    }

    // ─── Toast Notifications ──────────────────────────────
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ─── Image Preview ────────────────────────────────────
    function showImagePreview(src) {
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-image');
        img.src = src;
        preview.classList.remove('hidden');
        setTimeout(() => preview.classList.add('show'), 10);
    }

    function closeImagePreview() {
        const preview = document.getElementById('image-preview');
        preview.classList.remove('show');
        setTimeout(() => preview.classList.add('hidden'), 300);
    }

    // ─── Utilities ────────────────────────────────────────
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function generateId(prefix) {
        return Storage.generateId(prefix);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ─── Translations & Theme ─────────────────────────────
    function translateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.innerText = t(key);
        });
    }

    function updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const label = btn.querySelector('#theme-label');
        const icon = btn.querySelector('i');
        if (theme === 'dark') {
            if (label) label.innerText = t('theme.light');
            if (icon) icon.className = 'fas fa-sun';
        } else {
            if (label) label.innerText = t('theme.dark');
            if (icon) icon.className = 'fas fa-moon';
        }
    }

    function initTheme() {
        const theme = Storage.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeButton(theme);
    }

    function toggleTheme() {
        const current = Storage.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        Storage.setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        updateThemeButton(next);
    }

    function updateLangLabel() {
        const langLabel = document.getElementById('lang-label');
        if (langLabel) {
            langLabel.innerText = currentLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English';
        }
    }

    // ─── Sidebar ──────────────────────────────────────────
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const mobileBtn = document.getElementById('mobile-menu-toggle');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
        // Close mobile sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && e.target !== mobileBtn) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }

    // ─── Init ─────────────────────────────────────────────
    function init() {
        initTheme();
        initSidebar();

        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) navigateTo(page);
                // Close mobile sidebar
                document.getElementById('sidebar').classList.remove('mobile-open');
            });
        });

        // Theme toggle
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        // Modal overlay click to close
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
        }

        // Image preview click to close
        const imgPreview = document.getElementById('image-preview');
        if (imgPreview) {
            imgPreview.addEventListener('click', (e) => {
                if (e.target === imgPreview) closeImagePreview();
            });
        }

        // Start on dashboard
        navigateTo('dashboard');
        
        translateDOM();
        updateLangLabel();
    }

    let appInitialized = false;

    document.addEventListener('DOMContentLoaded', () => {
        const content = document.getElementById('app-content');
        const authOverlay = document.getElementById('auth-overlay');
        const authForm = document.getElementById('auth-form');
        const authEmail = document.getElementById('auth-email');
        const authPassword = document.getElementById('auth-password');
        const authError = document.getElementById('auth-error');
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        const authRegisterNotice = document.getElementById('auth-register-notice');
        const authForgotPassword = document.getElementById('auth-forgot-password');
        let isLoginMode = true;

        // Auth Tabs
        tabLogin.addEventListener('click', () => {
            isLoginMode = true;
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            authSubmitBtn.innerText = 'Login';
            authError.innerText = '';
            authRegisterNotice.classList.remove('hidden');
            if (authForgotPassword) authForgotPassword.classList.remove('hidden');
        });
        tabRegister.addEventListener('click', () => {
            isLoginMode = false;
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            authSubmitBtn.innerText = 'Register';
            authError.innerText = '';
            authRegisterNotice.classList.add('hidden');
            if (authForgotPassword) authForgotPassword.classList.add('hidden');
        });

        if (authForgotPassword) {
            authForgotPassword.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = authEmail.value;
                if (!email) {
                    authError.innerText = t('messages.email_required_reset');
                    return;
                }
                try {
                    await firebase.auth().sendPasswordResetEmail(email);
                    authError.innerText = "";
                    App.showToast(t('messages.reset_email_sent'), 'success');
                } catch (error) {
                    console.error("Reset password error:", error);
                    authError.innerText = t('messages.reset_email_error') + ": " + error.message;
                }
            });
        }

        // Auth Submit
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = authEmail.value;
            const password = authPassword.value;
            authSubmitBtn.disabled = true;
            authError.innerText = '';

            try {
                if (isLoginMode) {
                    await firebase.auth().signInWithEmailAndPassword(email, password);
                } else {
                    await firebase.auth().createUserWithEmailAndPassword(email, password);
                }
            } catch (error) {
                console.error("Auth error:", error);
                if (error.code === 'auth/email-already-in-use') {
                    authError.innerText = "This email is already registered. Please switch to the Login tab.";
                } else {
                    authError.innerText = error.message;
                }
            } finally {
                authSubmitBtn.disabled = false;
            }
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut();
            });
        }

        // Auth State Listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                authOverlay.classList.add('hidden');
                if (content && !appInitialized) {
                    content.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><i class="fas fa-circle-notch fa-spin fa-3x mb-3"></i><p>' + t('common.loading_db') + '</p></div>';
                }
                
                // Initialize storage for current user
                Storage.init(user.uid);

                Storage.ready(() => {
                    if (!appInitialized) {
                        init();
                        appInitialized = true;
                        
                        // Check for view_proof deep link
                        const urlParams = new URLSearchParams(window.location.search);
                        const proofParam = urlParams.get('view_proof');
                        if (proofParam) {
                            const [batchId, studentId] = proofParam.split('_');
                            const payment = Storage.getPayment(batchId, studentId);
                            if (payment && payment.proof) {
                                showImagePreview(payment.proof);
                            } else {
                                showToast(t('payment.proof_not_found'), 'error');
                            }
                            // Clean URL visually without reloading
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } else {
                        // If switching user on the same page load, force navigate to dashboard
                        navigateTo('dashboard');
                    }
                });
            } else {
                // Not logged in
                authOverlay.classList.remove('hidden');
                // Reset form
                authEmail.value = '';
                authPassword.value = '';
                authError.innerText = '';
                
                // Stop rendering main app components if we logged out
                if (appInitialized && content) {
                    content.innerHTML = '';
                }
            }
        });
    });

    return {
        navigateTo, getCurrentPage, getCurrentParams,
        setBreadcrumb,
        showModal, closeModal, showConfirm,
        showToast,
        showImagePreview, closeImagePreview,
        formatCurrency, formatDate, formatDateTime,
        generateId, escapeHtml,
        toggleTheme, translateDOM
    };
})();
