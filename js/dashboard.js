const Dashboard = (() => {
    function calculateStats() {
        const classes = Storage.getClasses();
        const students = Storage.getStudents();
        const batches = Storage.getBatches();
        
        let totalRevenue = 0;
        let totalOutstanding = 0;
        let pendingPayments = [];

        batches.forEach(batch => {
            const cls = Storage.getClass(batch.classId);
            if (!cls) return;

            const enrolled = Storage.getEnrolledStudents(batch.id);
            enrolled.forEach(student => {
                const totalDue = Storage.getTotalDue(batch.id, student.id) || 0;
                const payment = Storage.getPayment(batch.id, student.id);
                const amountPaid = payment ? payment.amountPaid : 0;
                const outstanding = totalDue - amountPaid;
                
                totalRevenue += amountPaid;
                
                if (outstanding > 0 && totalDue > 0) {
                    totalOutstanding += outstanding;
                    pendingPayments.push({
                        studentName: student.name,
                        className: cls.name,
                        batchName: batch.name,
                        batchId: batch.id,
                        outstanding: outstanding,
                        status: payment && payment.status === 'partial' ? t('payment.status_partial') : t('payment.status_unpaid'),
                        statusClass: payment && payment.status === 'partial' ? 'badge-warning' : 'badge-danger'
                    });
                }
            });
        });

        pendingPayments.sort((a, b) => b.outstanding - a.outstanding);
        const topPending = pendingPayments.slice(0, 10);
        
        // Sorting classes by createdAt descending for recent classes
        const recentClasses = [...classes].sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }).slice(0, 4);

        return {
            totalClasses: classes.length,
            totalStudents: students.length,
            totalRevenue,
            totalOutstanding,
            pendingPayments: topPending,
            recentClasses
        };
    }

    function renderEmptyState() {
        return `
            <div class="empty-state animate-in">
                <i class="fas fa-chart-line mb-16"></i>
                <p class="mb-16" data-i18n="dashboard.welcome_title">Chào mừng bạn đến với EduManager!</p>
                <p class="text-muted mb-16" data-i18n="dashboard.welcome_desc">Chưa có dữ liệu nào. Hãy bắt đầu bằng cách tạo lớp học đầu tiên.</p>
                <button class="btn btn-primary" onclick="App.navigateTo('classes')">
                    <i class="fas fa-plus"></i> <span data-i18n="classes.add_class">Tạo lớp học</span>
                </button>
            </div>
        `;
    }

    function render() {
        const content = document.getElementById('app-content');
        App.setBreadcrumb([{label: t('menu.dashboard'), page: 'dashboard'}]);
        
        const stats = calculateStats();

        if (stats.totalClasses === 0 && stats.totalStudents === 0) {
            content.innerHTML = renderEmptyState();
            App.translateDOM();
            return;
        }

        let html = `
            <div class="page-header animate-in">
                <h1 class="page-title" data-i18n="dashboard.overview">Tổng quan</h1>
                <p class="text-muted" data-i18n="dashboard.subtitle">Xin chào! Dưới đây là thông tin tổng quan về trung tâm của bạn.</p>
            </div>

            <div class="stats-grid mb-20 animate-in">
                <div class="stat-card">
                    <div class="stat-icon text-accent"><i class="fas fa-chalkboard-teacher"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="dashboard.total_classes">Tổng lớp học</div>
                        <div class="stat-value text-accent">${stats.totalClasses}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon text-info"><i class="fas fa-user-graduate"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="dashboard.total_students">Tổng học sinh</div>
                        <div class="stat-value text-info">${stats.totalStudents}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon text-success"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="dashboard.total_revenue">Tổng doanh thu</div>
                        <div class="stat-value text-success">${App.formatCurrency(stats.totalRevenue)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon text-danger"><i class="fas fa-exclamation-circle"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="dashboard.debt">Công nợ</div>
                        <div class="stat-value text-danger">${App.formatCurrency(stats.totalOutstanding)}</div>
                    </div>
                </div>
            </div>

            <div class="mb-20 animate-in-delay-1">
                <div class="d-flex justify-between align-center mb-16">
                    <h2 class="fw-700" data-i18n="dashboard.recent_classes">Lớp học gần đây</h2>
                    <button class="btn btn-sm btn-ghost" onclick="App.navigateTo('classes')" data-i18n="dashboard.view_all">Xem tất cả</button>
                </div>
                <div class="stats-grid">
        `;

        if (stats.recentClasses.length > 0) {
            stats.recentClasses.forEach(cls => {
                const batches = Storage.getBatchesByClass(cls.id) || [];
                let totalStudents = 0;
                batches.forEach(b => {
                    totalStudents += (Storage.getEnrollments(b.id) || []).length;
                });

                html += `
                    <div class="card p-16" style="cursor: pointer" onclick="App.navigateTo('class-detail', {classId: '${cls.id}'})">
                        <h3 class="fw-600 mb-12">${App.escapeHtml(cls.name)}</h3>
                        <div class="d-flex justify-between text-muted" style="font-size: 0.9em;">
                            <span><i class="fas fa-layer-group"></i> ${batches.length} <span data-i18n="classes.batch">đợt</span></span>
                            <span><i class="fas fa-user-graduate"></i> ${totalStudents} <span data-i18n="students.student">học sinh</span></span>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p class="text-muted col-12" data-i18n="classes.no_classes">Chưa có lớp học nào.</p>`;
        }

        html += `
                </div>
            </div>

            <div class="card animate-in-delay-2">
                <div class="card-header border-bottom p-16">
                    <h3 class="fw-700"><i class="fas fa-exclamation-circle text-danger mr-8"></i><span data-i18n="dashboard.unpaid_students">Học sinh chưa thanh toán</span></h3>
                </div>
                <div class="card-body p-0">
        `;

        if (stats.pendingPayments.length > 0) {
            html += `
                <div class="table-wrapper">
                    <table class="table w-100">
                        <thead>
                            <tr>
                                <th class="p-16" data-i18n="students.student">Tên học sinh</th>
                                <th class="p-16" data-i18n="classes.title">Lớp</th>
                                <th class="p-16" data-i18n="classes.batch">Đợt</th>
                                <th class="p-16 right" data-i18n="payment.outstanding">Số tiền còn thiếu</th>
                                <th class="p-16 center" data-i18n="students.status">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            stats.pendingPayments.forEach(p => {
                html += `
                    <tr class="border-bottom">
                        <td class="p-16 fw-600">${App.escapeHtml(p.studentName)}</td>
                        <td class="p-16">${App.escapeHtml(p.className)}</td>
                        <td class="p-16 text-muted">${App.escapeHtml(p.batchName)}</td>
                        <td class="p-16 right fw-700 text-danger">${App.formatCurrency(p.outstanding)}</td>
                        <td class="p-16 center"><span class="badge ${p.statusClass}">${p.status}</span></td>
                    </tr>
                `;
            });
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += `<div class="empty-state p-40"><p class="text-muted" data-i18n="dashboard.no_pending">Không có khoản thu nào đang chờ.</p></div>`;
        }

        html += `
                </div>
            </div>
        `;

        content.innerHTML = html;
        App.translateDOM();
    }

    return { render };
})();
