const BatchManager = (() => {
    function render(batchId, tab = 'students') {
        const batch = Storage.getBatch(batchId);
        if (!batch) {
            App.navigateTo('classes');
            return;
        }
        
        const cls = Storage.getClass(batch.classId);
        if (!cls) {
            App.navigateTo('classes');
            return;
        }

        App.setBreadcrumb([
            { label: t('menu.dashboard'), page: 'dashboard' },
            { label: t('classes.title'), page: 'classes' },
            { label: cls.name, page: 'class-detail', params: { classId: cls.id } },
            { label: batch.name }
        ]);

        const enrolledStudents = Storage.getEnrolledStudents(batchId);
        const studentCount = enrolledStudents.length;
        
        const sessionsCount = batch.sessions ? batch.sessions.length : 10;
        
        // Mock payment calculation for now, we'll get actual later if needed
        const payments = Storage.getPaymentsForBatch ? Storage.getPaymentsForBatch(batchId) : {};
        const paidCount = Object.values(payments).filter(p => p.status === 'paid').length;
        
        const container = document.getElementById('app-content');
        
        const allBatches = Storage.getBatchesByClass(cls.id) || [];
        allBatches.sort((a, b) => b.createdAt - a.createdAt); // newest first

        let batchSelector = '';
        if (allBatches.length > 1) {
            batchSelector = `<h1 class="page-title mr-12" style="margin-right: 12px;">${App.escapeHtml(cls.name)}</h1><select class="form-input" style="width: auto; font-size: 1.1rem; font-weight: bold; border: none; background: transparent; cursor: pointer;" onchange="App.navigateTo('batch-detail', {batchId: this.value, tab: '${tab}'})">`;
            allBatches.forEach(b => {
                batchSelector += `<option value="${b.id}" ${b.id === batchId ? 'selected' : ''}>${App.escapeHtml(b.name)}</option>`;
            });
            batchSelector += `</select>`;
        } else {
            batchSelector = `<h1 class="page-title">${App.escapeHtml(cls.name)} - ${App.escapeHtml(batch.name)}</h1>`;
        }

        let html = `
            <div class="page-header animate-in">
                <div class="d-flex align-center gap-12">
                    <button class="btn btn-icon btn-ghost" id="btn-back" title="${t('common.back_to_class')}">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    ${batchSelector}
                </div>
                <div class="d-flex align-center gap-8">
                    <button class="btn btn-primary btn-sm" onclick="ClassManager.showAddBatchModal('${cls.id}')" title="${t('classes.add_batch')}">
                        <i class="fas fa-plus"></i> <span data-i18n="classes.add_batch">Thêm đợt</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-config-sessions">
                        <i class="fas fa-calendar-alt mr-8"></i> <span data-i18n="batches.config">Cấu hình</span>
                    </button>
                </div>
            </div>
            <div class="tabs animate-in animate-in-delay-1">
                <button class="tab ${tab === 'students' ? 'active' : ''}" data-tab="students">
                    <i class="fas fa-users mr-8"></i> <span data-i18n="batches.students_tab">Học sinh</span>
                </button>
                <button class="tab ${tab === 'attendance' ? 'active' : ''}" data-tab="attendance">
                    <i class="fas fa-clipboard-check mr-8"></i> <span data-i18n="batches.attendance_tab">Điểm danh</span>
                </button>
                <button class="tab ${tab === 'payment' ? 'active' : ''}" data-tab="payment">
                    <i class="fas fa-money-bill-wave mr-8"></i> <span data-i18n="batches.payment_tab">Thanh toán</span>
                </button>
            </div>
            
            <div id="tab-content" class="animate-in animate-in-delay-2 mt-20"></div>
        `;
        
        container.innerHTML = html;
        App.translateDOM();
        
        // Event listeners
        document.getElementById('btn-back').addEventListener('click', () => {
            App.navigateTo('classes');
        });
        
        document.getElementById('btn-config-sessions').addEventListener('click', () => {
            showConfigSessionsModal(batchId);
        });
        
        const tabButtons = container.querySelectorAll('.tab');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selectedTab = e.currentTarget.getAttribute('data-tab');
                if (selectedTab !== tab) {
                    App.navigateTo('batch-detail', { batchId, tab: selectedTab });
                }
            });
        });
        
        // Render tab content
        const tabContentContainer = 'tab-content';
        
        if (tab === 'students') {
            renderStudentsTab(tabContentContainer, batchId);
        } else if (tab === 'attendance') {
            if (typeof AttendanceManager !== 'undefined') {
                AttendanceManager.renderInto(tabContentContainer, batchId);
            } else {
                document.getElementById(tabContentContainer).innerHTML = '<p>AttendanceManager chưa được tải.</p>';
            }
        } else if (tab === 'payment') {
            if (typeof PaymentManager !== 'undefined') {
                PaymentManager.renderInto(tabContentContainer, batchId);
            } else {
                document.getElementById(tabContentContainer).innerHTML = '<p>PaymentManager chưa được tải.</p>';
            }
        }
    }
    
    function showConfigSessionsModal(batchId) {
        const batch = Storage.getBatch(batchId);
        if (!batch) return;
        
        let sessionsHtml = '<div class="form-row">';
        for (let i = 1; i <= 10; i++) {
            const session = (batch.sessions || []).find(s => s.number === i) || { number: i, date: '' };
            const dateVal = session.date || '';
            sessionsHtml += `
                <div class="form-group col-6 mb-12">
                    <label class="form-label"><span data-i18n="batches.session">Buổi</span> ${i}</label>
                    <input type="text" class="form-input session-date-input" data-session="${i}" value="${dateVal}" placeholder="dd/mm/yyyy">
                </div>
            `;
        }
        sessionsHtml += '</div>';
        
        const bodyHtml = `
            <div class="section">
                <p class="mb-16 text-muted" data-i18n="batches.config_note">Cấu hình ngày học cho 10 buổi của khóa này.</p>
                ${sessionsHtml}
            </div>
        `;
        
        const footerHtml = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" id="btn-save-sessions" data-i18n="common.save">Lưu thay đổi</button>
        `;
        
        App.showModal(t('batches.config_sessions'), bodyHtml, footerHtml);
        setTimeout(() => App.translateDOM(), 0);
        
        // Initialize Flatpickr for the inputs
        setTimeout(() => {
            if (typeof flatpickr !== 'undefined') {
                flatpickr('.session-date-input', {
                    dateFormat: "Y-m-d",     // Save to JS object as ISO standard (YYYY-MM-DD)
                    altInput: true,          // Create a pretty secondary input for the user
                    altFormat: "d/m/Y",      // The user sees standard Vietnamese format (dd/mm/yyyy)
                    locale: "vn",
                    allowInput: true
                });
            }
        }, 50);
        
        document.getElementById('btn-save-sessions').addEventListener('click', () => {
            const inputs = document.querySelectorAll('.session-date-input');
            const newSessions = [];
            
            inputs.forEach(input => {
                newSessions.push({
                    number: parseInt(input.getAttribute('data-session')),
                    date: input.value
                });
            });
            
            batch.sessions = newSessions;
            Storage.saveBatch(batch);
            
            App.closeModal();
            App.showToast(t('messages.batch_config_saved'), 'success');
            
            // Reload page
            const currentUrl = new URL(window.location);
            const tab = currentUrl.searchParams.get('tab') || 'students';
            App.navigateTo('batch-detail', { batchId, tab });
        });
    }
    
    function renderStudentsTab(containerId, batchId) {
        const container = document.getElementById(containerId);
        const enrolledStudents = Storage.getEnrolledStudents(batchId);
        
        let html = `
            <div class="card">
                <div class="card-header d-flex justify-between align-center">
                    <h3 class="card-title" data-i18n="batches.student_list">Danh sách học sinh</h3>
                    <div class="d-flex gap-12">
                        <div class="search-bar">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="search-student" class="form-input" placeholder="${t('students.search_placeholder')}">
                        </div>
                        <button class="btn btn-primary" id="btn-add-student">
                            <i class="fas fa-plus mr-8"></i> <span data-i18n="batches.add_student">Thêm học sinh</span>
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
        `;
        
        if (enrolledStudents.length === 0) {
            html += `
                <div class="empty-state p-40 text-center">
                    <i class="fas fa-user-graduate text-muted mb-16" style="font-size: 3rem;"></i>
                    <p class="text-muted" data-i18n="batches.no_students">Chưa có học sinh nào trong đợt học này.</p>
                </div>
            `;
        } else {
            html += `
                <div class="table-wrapper">
                    <table class="table w-100">
                        <thead>
                            <tr>
                                <th data-i18n="students.student">Học sinh</th>
                                <th data-i18n="students.phone">Số điện thoại</th>
                                <th data-i18n="students.parent_phone">SĐT Phụ huynh</th>
                                <th data-i18n="students.status">Trạng thái</th>
                                <th class="right" data-i18n="common.actions">Hành động</th>
                            </tr>
                        </thead>
                        <tbody id="student-list-body">
            `;
            
            enrolledStudents.forEach((student, index) => {
                const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const statusBadge = student.status === 'active' ? 'badge-success' : 'badge-muted';
                const statusText = student.status === 'active' ? t('students.status_active') : t('students.status_quit');
                
                html += `
                            <tr class="student-row" data-name="${student.name.toLowerCase()}">
                                <td>
                                    <div class="d-flex align-center">
                                        <div class="student-avatar mr-12">${initials}</div>
                                        <div class="student-name-cell font-medium">${App.escapeHtml(student.name)}</div>
                                    </div>
                                </td>
                                <td>${App.escapeHtml(student.phone || '-')}</td>
                                <td>${App.escapeHtml(student.parentPhone || '-')}</td>
                                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                                <td class="right">
                                    <div class="d-flex justify-end gap-4">
                                        <button class="btn btn-icon btn-ghost btn-edit-student" data-id="${student.id}" title="${t('common.edit')}">
                                            <i class="fas fa-edit text-muted"></i>
                                        </button>
                                        <button class="btn btn-icon btn-ghost btn-remove-student" data-id="${student.id}" title="${t('batches.remove_student')}">
                                            <i class="fas fa-trash text-danger"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        App.translateDOM();
        
        // Search filter
        const searchInput = document.getElementById('search-student');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.student-row').forEach(row => {
                    const name = row.getAttribute('data-name');
                    if (name.includes(term)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
        
        // Add student button
        const btnAdd = document.getElementById('btn-add-student');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                if (typeof StudentManager !== 'undefined' && StudentManager.showAddStudentModal) {
                    StudentManager.showAddStudentModal(batchId, () => {
                        App.navigateTo('batch-detail', { batchId, tab: 'students' });
                    });
                } else {
                    App.showToast(t('batches.student_not_loaded'), 'error');
                }
            });
        }
        
        // Edit and Remove buttons
        document.querySelectorAll('.btn-edit-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (typeof StudentManager !== 'undefined' && StudentManager.showEditStudentModal) {
                    StudentManager.showEditStudentModal(id, () => {
                        App.navigateTo('batch-detail', { batchId, tab: 'students' });
                    });
                }
            });
        });
        
        document.querySelectorAll('.btn-remove-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                App.showConfirm(t('messages.confirm_remove_student'), () => {
                    Storage.unenrollStudent(batchId, id);
                    App.showToast(t('messages.student_removed'), 'success');
                    App.navigateTo('batch-detail', { batchId, tab: 'students' });
                });
            });
        });
    }
    
    return { render };
})();
