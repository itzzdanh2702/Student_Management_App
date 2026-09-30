const ClassManager = (() => {
    let classes = [];

    function render() {
        const container = document.getElementById('app-content');
        classes = Storage.getClasses() || [];

        let html = `
            <div class="page-header d-flex justify-between align-center flex-wrap mb-20 gap-12">
                <h1 class="page-title" data-i18n="classes.title">Lớp học</h1>
                <button class="btn btn-primary" onclick="ClassManager.showAddModal()">
                    <i class="fas fa-plus"></i> <span data-i18n="classes.add_class">Thêm lớp mới</span>
                </button>
            </div>
            
            <div class="search-bar mb-20">
                <div class="form-group">
                    <input type="text" id="class-search" class="form-input" placeholder="${t('classes.search_placeholder')}" onkeyup="ClassManager.filterClasses(this.value)">
                </div>
            </div>

            <div id="classes-container">
                ${renderClassesGrid(classes)}
            </div>
        `;
        
        container.innerHTML = html;
        App.setBreadcrumb([{ label: t('classes.title'), page: 'classes' }]);
        App.translateDOM();
    }

    function renderClassesGrid(classesToRender) {
        if (!classesToRender || classesToRender.length === 0) {
            return `
                <div class="empty-state animate-in">
                    <i class="fas fa-school text-muted"></i>
                    <p class="text-muted mt-8" data-i18n="classes.no_classes">Chưa có lớp học nào.</p>
                </div>
            `;
        }

        let html = '<div class="class-grid animate-in">';
        classesToRender.forEach(cls => {
            const batches = Storage.getBatchesByClass(cls.id) || [];
            let totalStudents = 0;
            batches.forEach(batch => {
                const enrolled = Storage.getEnrollments(batch.id) || [];
                totalStudents += enrolled.length;
            });

            html += `
                <div class="class-card card" onclick="App.navigateTo('class-detail', {classId: '${cls.id}'})">
                    <div class="class-card-top accent"></div>
                    <div class="card-body">
                        <h3 class="class-card-name">${App.escapeHtml(cls.name)}</h3>
                        <div class="class-card-stats stats-grid mt-12 mb-12">
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.batches">Đợt học:</span>
                                <span class="stat-value">${batches.length}</span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.students">Học viên:</span>
                                <span class="stat-value">${totalStudents}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer d-flex justify-between align-center">
                        <span class="text-accent fw-600">${App.formatCurrency(cls.pricePerSession)} / <span data-i18n="classes.session">buổi</span></span>
                        <div class="class-card-actions">
                            <button class="btn btn-icon btn-ghost text-info" onclick="event.stopPropagation(); ClassManager.showEditModal('${cls.id}')" title="${t('classes.edit')}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-ghost text-danger" onclick="event.stopPropagation(); ClassManager.deleteClass('${cls.id}')" title="${t('classes.delete')}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    function filterClasses(query) {
        const q = query.toLowerCase().trim();
        const filtered = classes.filter(c => c.name.toLowerCase().includes(q));
        const container = document.getElementById('classes-container');
        if (container) {
            container.innerHTML = renderClassesGrid(filtered);
            App.translateDOM();
        }
    }

    function showAddModal() {
        const body = `
            <div class="form-group mb-16">
                <label class="form-label"><span data-i18n="classes.class_name">Tên lớp học</span> <span class="text-danger">*</span></label>
                <input type="text" id="class-name-input" class="form-input" placeholder="${t('classes.class_name_placeholder')}">
            </div>
            <div class="form-group">
                <label class="form-label"><span data-i18n="classes.fee_per_session">Học phí mỗi buổi (VND)</span> <span class="text-danger">*</span></label>
                <input type="number" id="class-price-input" class="form-input" placeholder="${t('classes.fee_placeholder')}" min="0" step="10000">
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" onclick="ClassManager.saveClass()" data-i18n="common.save">Lưu</button>
        `;

        App.showModal(t('classes.add_class'), body, footer);
        setTimeout(() => App.translateDOM(), 0);
    }

    function showEditModal(id) {
        const cls = Storage.getClass(id);
        if (!cls) return;

        const body = `
            <input type="hidden" id="class-id-input" value="${cls.id}">
            <div class="form-group mb-16">
                <label class="form-label"><span data-i18n="classes.class_name">Tên lớp học</span> <span class="text-danger">*</span></label>
                <input type="text" id="class-name-input" class="form-input" value="${App.escapeHtml(cls.name)}">
            </div>
            <div class="form-group">
                <label class="form-label"><span data-i18n="classes.fee_per_session">Học phí mỗi buổi (VND)</span> <span class="text-danger">*</span></label>
                <input type="number" id="class-price-input" class="form-input" value="${cls.pricePerSession}" min="0" step="10000">
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" onclick="ClassManager.saveClass()" data-i18n="common.save">Lưu thay đổi</button>
        `;

        App.showModal(t('classes.edit'), body, footer);
        setTimeout(() => App.translateDOM(), 0);
    }

    function saveClass() {
        const idInput = document.getElementById('class-id-input');
        const nameInput = document.getElementById('class-name-input');
        const priceInput = document.getElementById('class-price-input');
        
        const id = idInput ? idInput.value : Storage.generateId('cls');
        const name = nameInput.value.trim();
        const price = parseInt(priceInput.value);

        if (!name) {
            App.showToast(t('messages.class_name_required'), 'error');
            return;
        }
        if (isNaN(price) || price < 0) {
            App.showToast(t('messages.invalid_fee'), 'error');
            return;
        }

        const cls = {
            id,
            name,
            pricePerSession: price,
            createdAt: idInput ? Storage.getClass(id).createdAt : new Date().toISOString()
        };

        Storage.saveClass(cls);
        App.closeModal();
        App.showToast(idInput ? t('messages.class_updated') : t('messages.class_added'), 'success');
        
        if (document.getElementById('class-detail-container') && idInput) {
             renderDetail(id);
        } else {
             render();
        }
    }

    function deleteClass(id) {
        App.showConfirm(t('messages.confirm_delete_class'), () => {
            Storage.deleteClass(id);
            App.showToast(t('messages.class_deleted'), 'success');
            render();
        });
    }

    // --- Detail Page ---

    function renderDetail(classId) {
        const container = document.getElementById('app-content');
        const cls = Storage.getClass(classId);
        
        if (!cls) {
            container.innerHTML = `
                <div class="empty-state">
                    <p data-i18n="classes.class_not_found">Không tìm thấy lớp học.</p>
                    <button class="btn btn-primary mt-16" onclick="App.navigateTo('classes')" data-i18n="common.back">Quay lại danh sách</button>
                </div>
            `;
            App.translateDOM();
            return;
        }

        const batches = Storage.getBatchesByClass(classId) || [];
        
        if (batches.length > 0) {
            // Sort by createdAt descending to get the newest batch
            batches.sort((a, b) => b.createdAt - a.createdAt);
            const latestBatch = batches[0];
            // Small timeout to allow the current stack to clear so router works properly
            setTimeout(() => {
                App.navigateTo('batch-detail', { batchId: latestBatch.id, tab: 'attendance' });
            }, 0);
            return;
        }

        App.setBreadcrumb([
            { label: t('menu.dashboard'), page: 'dashboard' },
            { label: t('classes.title'), page: 'classes' },
            { label: cls.name, page: 'class-detail', params: { classId } }
        ]);

        let html = `
            <div id="class-detail-container">
                <div class="page-header d-flex justify-between align-center flex-wrap mb-20 gap-12">
                    <div class="d-flex align-center gap-12">
                        <button class="btn btn-icon btn-ghost" onclick="App.navigateTo('classes')">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h1 class="page-title">${App.escapeHtml(cls.name)}</h1>
                    </div>
                    <button class="btn btn-primary" onclick="ClassManager.showAddBatchModal('${classId}')">
                        <i class="fas fa-plus"></i> <span data-i18n="classes.add_batch">Thêm đợt mới</span>
                    </button>
                </div>
                
                <div class="card mb-24 animate-in">
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.fee">Học phí:</span>
                                <span class="stat-value text-accent">${App.formatCurrency(cls.pricePerSession)} / <span data-i18n="classes.session">buổi</span></span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.created_date">Ngày tạo:</span>
                                <span class="stat-value">${App.formatDate(cls.createdAt)}</span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.total_batches">Tổng số đợt học:</span>
                                <span class="stat-value">${batches.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-between align-center mb-16">
                    <h2 class="section-title" data-i18n="classes.batch_list">Danh sách đợt học</h2>
                </div>
                
                ${renderBatchesGrid(batches, classId)}
            </div>
        `;
        
        container.innerHTML = html;
        App.translateDOM();
    }

    function renderBatchesGrid(batches, classId) {
        if (!batches || batches.length === 0) {
            return `
                <div class="empty-state animate-in-delay-1">
                    <i class="fas fa-calendar-alt text-muted"></i>
                    <p class="text-muted mt-8" data-i18n="classes.no_batches">Chưa có đợt học nào cho lớp này.</p>
                </div>
            `;
        }

        let html = '<div class="batch-grid animate-in-delay-1">';
        batches.forEach(batch => {
            const students = Storage.getEnrollments(batch.id) || [];
            const numSessions = batch.sessions ? batch.sessions.length : 0;
            
            let dateRange = t('classes.no_schedule');
            if (numSessions > 0) {
                const dates = batch.sessions.filter(s => s.date).map(s => new Date(s.date));
                if (dates.length > 0) {
                    const minDate = new Date(Math.min(...dates));
                    const maxDate = new Date(Math.max(...dates));
                    dateRange = `${App.formatDate(minDate.toISOString())} - ${App.formatDate(maxDate.toISOString())}`;
                }
            }

            html += `
                <div class="batch-card card" onclick="App.navigateTo('batch-detail', {batchId: '${batch.id}', tab: 'students'})">
                    <div class="card-body">
                        <div class="d-flex justify-between align-center mb-16">
                            <h3 class="card-title d-flex align-center gap-8 m-0">
                                <i class="fas fa-calendar-check text-muted"></i> ${App.escapeHtml(batch.name)}
                            </h3>
                            <button class="btn btn-icon btn-ghost text-danger" onclick="event.stopPropagation(); ClassManager.deleteBatch('${batch.id}', '${classId}')" title="${t('classes.delete_batch')}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="stats-grid mb-16">
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.session_count">Số buổi:</span>
                                <span class="stat-value">${numSessions}</span>
                            </div>
                            <div class="stat-info">
                                <span class="stat-label" data-i18n="classes.students">Học viên:</span>
                                <span class="stat-value">${students.length}</span>
                            </div>
                        </div>
                        <div class="text-muted fs-sm d-flex align-center gap-8">
                            <i class="fas fa-clock"></i> ${dateRange}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    function showAddBatchModal(classId) {
        const body = `
            <div class="form-group mb-16">
                <label class="form-label"><span data-i18n="classes.batch_name">Tên đợt học</span> <span class="text-danger">*</span></label>
                <input type="text" id="batch-name-input" class="form-input" placeholder="${t('classes.batch_name_placeholder')}">
            </div>
            <div class="reminder-box mb-12">
                <i class="fas fa-info-circle text-info"></i>
                <p class="text-muted fs-sm m-0" data-i18n="classes.batch_auto_note">Hệ thống sẽ tự động tạo 10 buổi học trống. Bạn có thể chỉnh sửa ngày cụ thể sau trong chi tiết đợt.</p>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" onclick="ClassManager.saveNewBatch('${classId}')" data-i18n="classes.create_batch">Tạo đợt học</button>
        `;

        App.showModal(t('classes.add_batch'), body, footer);
        setTimeout(() => App.translateDOM(), 0);
    }

    function saveNewBatch(classId) {
        const nameInput = document.getElementById('batch-name-input');
        const name = nameInput.value.trim();

        if (!name) {
            App.showToast(t('messages.batch_name_required'), 'error');
            return;
        }

        const batchId = Storage.generateId('bat');
        const sessions = [];
        for (let i = 1; i <= 10; i++) {
            sessions.push({ number: i, date: null });
        }

        const batch = {
            id: batchId,
            classId: classId,
            name: name,
            sessions: sessions,
            createdAt: new Date().toISOString()
        };

        Storage.saveBatch(batch);
        App.closeModal();
        App.showToast(t('messages.batch_added'), 'success');
        renderDetail(classId);
    }

    function deleteBatch(batchId, classId) {
        App.showConfirm(t('messages.confirm_delete_batch'), () => {
            Storage.deleteBatch(batchId);
            App.showToast(t('messages.batch_deleted'), 'success');
            renderDetail(classId);
        });
    }

    window.ClassManager = { 
        render, 
        renderDetail,
        showAddModal,
        showEditModal,
        saveClass,
        deleteClass,
        filterClasses,
        showAddBatchModal,
        saveNewBatch,
        deleteBatch
    };

    return window.ClassManager;
})();
