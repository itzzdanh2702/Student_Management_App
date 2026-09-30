const StudentManager = (() => {
    
    function showAddStudentModal(batchId, onComplete) {
        const existingStudents = Storage.getStudents() || [];
        const enrolledIds = Storage.getEnrollments(batchId) || [];
        
        const availableStudents = existingStudents.filter(s => !enrolledIds.includes(s.id));

        let studentOptions = `<option value="">-- ${t('students.select_existing_student')} --</option>`;
        availableStudents.forEach(s => {
            studentOptions += `<option value="${s.id}">${App.escapeHtml(s.name)} ${s.phone ? ' - ' + s.phone : ''}</option>`;
        });

        const body = `
            <div class="tabs mb-16">
                <div class="tab active" onclick="StudentManager.switchTab(this, 'existing')">${t('students.select_existing')}</div>
                <div class="tab" onclick="StudentManager.switchTab(this, 'new')">${t('students.add_new')}</div>
            </div>

            <div id="tab-existing" class="tab-content animate-in">
                <div class="form-group mb-16">
                    <label class="form-label"><span data-i18n="students.choose_student">Chọn học viên</span> <span class="text-danger">*</span></label>
                    <select id="existing-student-select" class="form-select">
                        ${studentOptions}
                    </select>
                </div>
                ${availableStudents.length === 0 ? `<p class="text-muted fs-sm"><i class="fas fa-info-circle"></i> ${t('students.no_existing_students')}</p>` : ''}
            </div>

            <div id="tab-new" class="tab-content animate-in" style="display: none;">
                <div class="form-group mb-12">
                    <label class="form-label"><span data-i18n="students.student_name">Tên học viên</span> <span class="text-danger">*</span></label>
                    <input type="text" id="new-student-name" class="form-input" placeholder="${t('students.name_placeholder')}">
                </div>
                <div class="form-row mb-12 d-flex gap-12">
                    <div class="form-group" style="flex:1">
                        <label class="form-label" data-i18n="students.phone">Số điện thoại</label>
                        <input type="text" id="new-student-phone" class="form-input" placeholder="${t('students.phone_placeholder')}">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label class="form-label" data-i18n="students.parent_phone">SĐT Phụ huynh</label>
                        <input type="text" id="new-student-parent-phone" class="form-input" placeholder="${t('students.parent_phone_placeholder')}">
                    </div>
                </div>
                <div class="form-group mb-12">
                    <label class="form-label">Email</label>
                    <input type="email" id="new-student-email" class="form-input" placeholder="${t('students.email_placeholder')}">
                </div>
                <div class="form-group">
                    <label class="form-label" data-i18n="students.note">Ghi chú</label>
                    <textarea id="new-student-note" class="form-textarea" rows="2" placeholder="${t('students.note_placeholder')}"></textarea>
                </div>
            </div>
            
            <input type="hidden" id="add-student-mode" value="existing">
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" onclick="StudentManager.handleAddStudent('${batchId}')" data-i18n="students.add_to_batch">Thêm vào đợt</button>
        `;

        window._currentAddStudentCallback = onComplete;
        App.showModal(t('students.add_student'), body, footer);
        setTimeout(() => App.translateDOM(), 0);
    }

    function switchTab(el, mode) {
        const tabs = el.parentElement.querySelectorAll('.tab');
        tabs.forEach(t => t.classList.remove('active'));
        el.classList.add('active');

        document.getElementById('tab-existing').style.display = mode === 'existing' ? 'block' : 'none';
        document.getElementById('tab-new').style.display = mode === 'new' ? 'block' : 'none';
        document.getElementById('add-student-mode').value = mode;
    }

    function handleAddStudent(batchId) {
        const mode = document.getElementById('add-student-mode').value;
        let studentId;

        if (mode === 'existing') {
            studentId = document.getElementById('existing-student-select').value;
            if (!studentId) {
                App.showToast(t('messages.select_student_required'), 'error');
                return;
            }
        } else {
            const name = document.getElementById('new-student-name').value.trim();
            if (!name) {
                App.showToast(t('messages.student_name_required'), 'error');
                return;
            }

            studentId = Storage.generateId('stu');
            const newStudent = {
                id: studentId,
                name: name,
                phone: document.getElementById('new-student-phone').value.trim(),
                parentPhone: document.getElementById('new-student-parent-phone').value.trim(),
                email: document.getElementById('new-student-email').value.trim(),
                note: document.getElementById('new-student-note').value.trim(),
                status: 'active',
                createdAt: new Date().toISOString()
            };
            Storage.saveStudent(newStudent);
        }

        Storage.enrollStudent(batchId, studentId);
        App.closeModal();
        App.showToast(t('messages.student_added'), 'success');

        if (window._currentAddStudentCallback) {
            window._currentAddStudentCallback();
            window._currentAddStudentCallback = null;
        }
    }

    function showEditStudentModal(studentId, onComplete) {
        const student = Storage.getStudent(studentId);
        if (!student) return;

        const body = `
            <div class="form-group mb-12">
                <label class="form-label"><span data-i18n="students.student_name">Tên học viên</span> <span class="text-danger">*</span></label>
                <input type="text" id="edit-student-name" class="form-input" value="${App.escapeHtml(student.name)}">
            </div>
            <div class="form-row mb-12 d-flex gap-12">
                <div class="form-group" style="flex:1">
                    <label class="form-label" data-i18n="students.phone">Số điện thoại</label>
                    <input type="text" id="edit-student-phone" class="form-input" value="${App.escapeHtml(student.phone || '')}">
                </div>
                <div class="form-group" style="flex:1">
                    <label class="form-label" data-i18n="students.parent_phone">SĐT Phụ huynh</label>
                    <input type="text" id="edit-student-parent-phone" class="form-input" value="${App.escapeHtml(student.parentPhone || '')}">
                </div>
            </div>
            <div class="form-group mb-12">
                <label class="form-label">Email</label>
                <input type="email" id="edit-student-email" class="form-input" value="${App.escapeHtml(student.email || '')}">
            </div>
            <div class="form-group mb-12">
                <label class="form-label" data-i18n="students.status">Trạng thái</label>
                <select id="edit-student-status" class="form-select">
                    <option value="active" ${student.status === 'active' ? 'selected' : ''}>${t('students.status_active')}</option>
                    <option value="paused" ${student.status === 'paused' ? 'selected' : ''}>${t('students.status_paused')}</option>
                    <option value="quit" ${student.status === 'quit' ? 'selected' : ''}>${t('students.status_quit')}</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" data-i18n="students.note">Ghi chú</label>
                <textarea id="edit-student-note" class="form-textarea" rows="2">${App.escapeHtml(student.note || '')}</textarea>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" onclick="StudentManager.handleEditStudent('${studentId}')" data-i18n="common.save">Lưu thay đổi</button>
        `;

        window._currentEditStudentCallback = onComplete;
        App.showModal(t('students.update_student'), body, footer);
        setTimeout(() => App.translateDOM(), 0);
    }

    function handleEditStudent(studentId) {
        const student = Storage.getStudent(studentId);
        if (!student) return;

        const name = document.getElementById('edit-student-name').value.trim();
        if (!name) {
            App.showToast(t('messages.student_name_required'), 'error');
            return;
        }

        student.name = name;
        student.phone = document.getElementById('edit-student-phone').value.trim();
        student.parentPhone = document.getElementById('edit-student-parent-phone').value.trim();
        student.email = document.getElementById('edit-student-email').value.trim();
        student.status = document.getElementById('edit-student-status').value;
        student.note = document.getElementById('edit-student-note').value.trim();

        Storage.saveStudent(student);
        App.closeModal();
        App.showToast(t('messages.student_updated'), 'success');

        if (window._currentEditStudentCallback) {
            window._currentEditStudentCallback();
            window._currentEditStudentCallback = null;
        }
    }

    function getStatusBadge(status) {
        switch(status) {
            case 'active': return '<span class="badge badge-success">' + t('students.status_active') + '</span>';
            case 'paused': return '<span class="badge badge-warning">' + t('students.status_paused') + '</span>';
            case 'quit': return '<span class="badge badge-danger">' + t('students.status_quit') + '</span>';
            default: return '<span class="badge badge-muted">' + t('students.status_unknown') + '</span>';
        }
    }

    function getInitials(name) {
        if (!name) return 'HV';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    let allStudents = [];

    function renderList() {
        const container = document.getElementById('app-content');
        allStudents = Storage.getStudents() || [];

        let html = `
            <div class="page-header d-flex justify-between align-center flex-wrap mb-20 gap-12">
                <h1 class="page-title" data-i18n="students.title">Quản lý học sinh</h1>
            </div>
            
            <div class="card mb-20 animate-in">
                <div class="card-body">
                    <div class="stats-grid">
                        <div class="stat-info">
                            <span class="stat-label"><i class="fas fa-users mr-8"></i><span data-i18n="students.total_students">Tổng số học sinh</span>:</span>
                            <span class="stat-value text-primary">${allStudents.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="search-bar mb-20 animate-in">
                <div class="form-group">
                    <input type="text" id="student-search" class="form-input" placeholder="${t('students.search_placeholder')}" onkeyup="StudentManager.filterStudents(this.value)">
                </div>
            </div>

            <div id="students-container">
                ${renderStudentsTable(allStudents)}
            </div>
        `;
        
        container.innerHTML = html;
        App.setBreadcrumb([{ label: t('menu.students'), page: 'students' }]);
        App.translateDOM();
    }

    function renderStudentsTable(studentsToRender) {
        if (!studentsToRender || studentsToRender.length === 0) {
            return `
                <div class="empty-state animate-in">
                    <i class="fas fa-user-graduate text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-16" data-i18n="students.no_students">Chưa có học sinh nào.</p>
                </div>
            `;
        }

        let html = `
            <div class="table-wrapper animate-in card">
                <table class="table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th data-i18n="students.student">Học sinh</th>
                            <th data-i18n="students.phone">Số điện thoại</th>
                            <th data-i18n="students.parent_phone">SĐT Phụ huynh</th>
                            <th>Email</th>
                            <th data-i18n="students.status">Trạng thái</th>
                            <th class="text-center" style="width: 100px;" data-i18n="common.actions">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        studentsToRender.forEach((student, index) => {
            html += `
                <tr>
                    <td>
                        <div class="d-flex align-center gap-12">
                            <div class="avatar bg-light d-flex align-center justify-center" style="width: 32px; height: 32px; border-radius: 50%; font-weight: 600; color: var(--primary-color);">
                                ${getInitials(student.name)}
                            </div>
                            <div class="fw-600">${App.escapeHtml(student.name)}</div>
                        </div>
                    </td>
                    <td>${App.escapeHtml(student.phone || '---')}</td>
                    <td>${App.escapeHtml(student.parentPhone || '---')}</td>
                    <td>${App.escapeHtml(student.email || '---')}</td>
                    <td>${getStatusBadge(student.status)}</td>
                    <td class="text-center">
                        <div class="d-flex justify-center gap-4">
                            <button class="btn btn-icon btn-ghost text-info" onclick="StudentManager.showEditStudentModal('${student.id}', StudentManager.renderList)" title="${t('common.edit')}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-ghost text-danger" onclick="StudentManager.deleteStudentList('${student.id}')" title="${t('common.delete')}">
                                <i class="fas fa-trash"></i>
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
        return html;
    }

    function filterStudents(query) {
        const q = query.toLowerCase().trim();
        const filtered = allStudents.filter(s => s.name.toLowerCase().includes(q));
        const container = document.getElementById('students-container');
        if (container) {
            container.innerHTML = renderStudentsTable(filtered);
            App.translateDOM();
        }
    }

    function deleteStudentList(id) {
        App.showConfirm(t('messages.confirm_delete_student'), () => {
            Storage.deleteStudent(id);
            App.showToast(t('messages.student_deleted'), 'success');
            renderList();
        });
    }

    window.StudentManager = {
        renderList,
        filterStudents,
        deleteStudentList,
        showAddStudentModal,
        showEditStudentModal,
        getStatusBadge,
        getInitials,
        switchTab,
        handleAddStudent,
        handleEditStudent
    };

    return window.StudentManager;
})();
