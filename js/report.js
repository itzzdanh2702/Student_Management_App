const ReportManager = (() => {
    let charts = [];

    function destroyCharts() {
        charts.forEach(c => c.destroy());
        charts = [];
    }

    function calculateStats() {
        const classes = Storage.getClasses();
        const batches = Storage.getBatches();
        
        let totalSessionsTaught = 0;
        let totalDueOverall = 0;
        let totalPaidOverall = 0;

        let totalPresent = 0;
        let totalAttendanceSlots = 0;

        let paymentStatusCounts = { paid: 0, partial: 0, unpaid: 0 };
        let classRevenue = {};

        // For attendance chart
        let attCounts = { present: 0, absent: 0, excused: 0, late: 0 };

        const classTableData = [];

        classes.forEach(cls => {
            classRevenue[cls.name] = 0;
            const classBatches = Storage.getBatchesByClass(cls.id);
            
            classBatches.forEach(batch => {
                totalSessionsTaught += batch.sessions.length;
                
                let batchTotalDue = 0;
                let batchTotalPaid = 0;
                let batchPresent = 0;
                let batchSlots = 0;

                const enrolled = Storage.getEnrolledStudents(batch.id);
                enrolled.forEach(student => {
                    const due = Storage.getTotalDue(batch.id, student.id) || 0;
                    const payment = Storage.getPayment(batch.id, student.id);
                    const paid = payment ? payment.amountPaid : 0;
                    const status = payment ? payment.status : (due > 0 ? 'unpaid' : 'paid'); // if no due, consider paid

                    batchTotalDue += due;
                    batchTotalPaid += paid;
                    classRevenue[cls.name] += paid;

                    if (due > 0) {
                        if (status === 'paid') paymentStatusCounts.paid++;
                        else if (status === 'partial') paymentStatusCounts.partial++;
                        else paymentStatusCounts.unpaid++;
                    }

                    const attStats = Storage.getStudentAttendanceStats(batch.id, student.id);
                    batchPresent += attStats.present + attStats.late; // late is often considered attended
                    batchSlots += attStats.total;

                    attCounts.present += attStats.present;
                    attCounts.absent += attStats.absent;
                    attCounts.excused += attStats.excused;
                    attCounts.late += attStats.late;
                });

                totalDueOverall += batchTotalDue;
                totalPaidOverall += batchTotalPaid;
                totalPresent += batchPresent;
                totalAttendanceSlots += batchSlots;

                const collectionRate = batchTotalDue > 0 ? Math.round((batchTotalPaid / batchTotalDue) * 100) : 100;
                const attRate = batchSlots > 0 ? Math.round((batchPresent / batchSlots) * 100) : 0;

                classTableData.push({
                    className: cls.name,
                    batchName: batch.name,
                    studentCount: enrolled.length,
                    totalDue: batchTotalDue,
                    totalPaid: batchTotalPaid,
                    collectionRate,
                    attRate
                });
            });
        });

        const collectionRateOverall = totalDueOverall > 0 ? Math.round((totalPaidOverall / totalDueOverall) * 100) : 100;
        const attRateOverall = totalAttendanceSlots > 0 ? Math.round((totalPresent / totalAttendanceSlots) * 100) : 0;

        return {
            totalBatches: batches.length,
            attRateOverall,
            collectionRateOverall,
            totalSessionsTaught,
            classRevenue,
            paymentStatusCounts,
            attCounts,
            classTableData
        };
    }

    function renderCharts(stats) {
        // Chart colors
        const colors = {
            accent: '#818cf8',
            success: '#34d399',
            warning: '#fbbf24',
            danger: '#f87171',
            info: '#38bdf8',
            extra1: '#a78bfa',
            extra2: '#f472b6'
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            color: '#94a3b8',
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        };

        const doughnutOptions = {
            responsive: true,
            maintainAspectRatio: false,
            color: '#94a3b8',
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        };

        // 1. Revenue by Class
        const ctxRevenue = document.getElementById('chartRevenue');
        if (ctxRevenue) {
            const labels = Object.keys(stats.classRevenue);
            const data = Object.values(stats.classRevenue);
            charts.push(new Chart(ctxRevenue, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: t('report.revenue_vnd'),
                        data,
                        backgroundColor: colors.accent,
                        borderRadius: 4
                    }]
                },
                options: chartOptions
            }));
        }

        // 2. Payment Status
        const ctxPayment = document.getElementById('chartPayment');
        if (ctxPayment) {
            charts.push(new Chart(ctxPayment, {
                type: 'doughnut',
                data: {
                    labels: [t('payment.status_paid'), t('payment.status_partial'), t('payment.status_unpaid')],
                    datasets: [{
                        data: [stats.paymentStatusCounts.paid, stats.paymentStatusCounts.partial, stats.paymentStatusCounts.unpaid],
                        backgroundColor: [colors.success, colors.warning, colors.danger],
                        borderWidth: 0
                    }]
                },
                options: doughnutOptions
            }));
        }

        // 3. Attendance Overview
        const ctxAtt = document.getElementById('chartAttendance');
        if (ctxAtt) {
            charts.push(new Chart(ctxAtt, {
                type: 'bar',
                data: {
                    labels: [t('attendance.status_present'), t('attendance.status_absent'), t('attendance.status_excused'), t('attendance.status_late')],
                    datasets: [{
                        label: t('report.attendance_count'),
                        data: [stats.attCounts.present, stats.attCounts.absent, stats.attCounts.excused, stats.attCounts.late],
                        backgroundColor: [colors.success, colors.danger, colors.warning, colors.info],
                        borderRadius: 4
                    }]
                },
                options: chartOptions
            }));
        }
    }

    function render() {
        destroyCharts();
        const content = document.getElementById('app-content');
        App.setBreadcrumb([{label: t('menu.reports')}]);

        const stats = calculateStats();

        let html = `
            <div class="page-header animate-in">
                <h1 class="page-title"><i class="fas fa-chart-bar"></i> <span data-i18n="menu.reports">Thống kê & Báo cáo</span></h1>
                <p class="text-muted" data-i18n="report.description">Phân tích dữ liệu học tập và tài chính</p>
            </div>

            <div class="stats-grid mb-20 animate-in">
                <div class="stat-card info">
                    <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="report.total_batches">Tổng số Nhóm học</div>
                        <div class="stat-value">${stats.totalBatches}</div>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="report.attendance_rate">Tỷ lệ đi học</div>
                        <div class="stat-value">${stats.attRateOverall}%</div>
                    </div>
                </div>
                <div class="stat-card accent">
                    <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="report.collection_rate">Tỷ lệ thu phí</div>
                        <div class="stat-value">${stats.collectionRateOverall}%</div>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon"><i class="fas fa-chalkboard"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="report.sessions_taught">Số buổi đã dạy</div>
                        <div class="stat-value">${stats.totalSessionsTaught}</div>
                    </div>
                </div>
            </div>

            <div class="charts-grid mb-20 animate-in-delay-1" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div class="card">
                    <div class="card-header"><h3 class="card-title" data-i18n="report.revenue_by_class">Doanh thu theo lớp</h3></div>
                    <div class="card-body" style="height: 300px;">
                        <canvas id="chartRevenue"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3 class="card-title" data-i18n="report.payment_status">Trạng thái học phí</h3></div>
                    <div class="card-body" style="height: 300px;">
                        <canvas id="chartPayment"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3 class="card-title" data-i18n="report.attendance_overview">Tổng quan điểm danh</h3></div>
                    <div class="card-body" style="height: 300px;">
                        <canvas id="chartAttendance"></canvas>
                    </div>
                </div>
            </div>

            <div class="card animate-in-delay-2">
                <div class="card-header">
                    <h3 class="card-title" data-i18n="report.batch_details">Chi tiết nhóm học</h3>
                </div>
                <div class="card-body">
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th data-i18n="classes.title">Lớp học</th>
                                    <th data-i18n="classes.batch">Nhóm</th>
                                    <th class="center" data-i18n="report.student_count">Sĩ số</th>
                                    <th class="right" data-i18n="payment.total_due">Cần thu</th>
                                    <th class="right" data-i18n="payment.total_collected">Đã thu</th>
                                    <th class="center" data-i18n="report.collection_rate">Tỷ lệ thu</th>
                                    <th class="center" data-i18n="report.attendance_rate">Tỷ lệ đi học</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (stats.classTableData.length > 0) {
            stats.classTableData.forEach(row => {
                html += `
                    <tr>
                        <td class="fw-600">${App.escapeHtml(row.className)}</td>
                        <td>${App.escapeHtml(row.batchName)}</td>
                        <td class="center">${row.studentCount}</td>
                        <td class="right">${App.formatCurrency(row.totalDue)}</td>
                        <td class="right text-success">${App.formatCurrency(row.totalPaid)}</td>
                        <td class="center">
                            <div class="progress-bar" style="width: 60px; display: inline-block; vertical-align: middle; margin-right: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden;">
                                <div class="progress-bar-fill ${row.collectionRate === 100 ? 'success' : 'accent'}" style="width: ${row.collectionRate}%; height: 100%;"></div>
                            </div>
                            <span>${row.collectionRate}%</span>
                        </td>
                        <td class="center">
                            <div class="progress-bar" style="width: 60px; display: inline-block; vertical-align: middle; margin-right: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden;">
                                <div class="progress-bar-fill ${row.attRate >= 80 ? 'success' : (row.attRate >= 50 ? 'warning' : 'danger')}" style="width: ${row.attRate}%; height: 100%;"></div>
                            </div>
                            <span>${row.attRate}%</span>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="7" class="center text-muted" data-i18n="common.no_data">Chưa có dữ liệu</td></tr>`;
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
        App.translateDOM();
        
        // Render charts after DOM is updated
        setTimeout(() => {
            renderCharts(stats);
        }, 0);
    }

    return { render };
})();
