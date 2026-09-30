const AttendanceManager = (() => {
    function renderInto(containerId, batchId) {
        const container = document.getElementById(containerId);
        const batch = Storage.getBatch(batchId);
        if (!batch) return;
        
        const enrolledStudents = Storage.getEnrolledStudents(batchId);
        
        if (enrolledStudents.length === 0) {
            container.innerHTML = `
                <div class="card p-40 text-center empty-state">
                    <i class="fas fa-clipboard-check text-muted mb-16" style="font-size: 3rem;"></i>
                    <p class="text-muted" data-i18n="attendance.no_students">Chưa có học sinh nào. Hãy thêm học sinh để điểm danh.</p>
                </div>
            `;
            App.translateDOM();
            return;
        }
        
        const sessions = batch.sessions || [];
        
        let html = `
            <div class="card mb-20">
                <div class="card-header">
                    <h3 class="card-title" data-i18n="attendance.table">Bảng điểm danh</h3>
                </div>
                <div class="card-body p-0">
                    <div class="att-summary p-16 bg-light border-bottom">
                        <div class="d-flex gap-16 flex-wrap">
                            <span class="d-flex align-center"><i class="fas fa-check text-success mr-4"></i> <span data-i18n="attendance.status_present">Có mặt</span></span>
                            <span class="d-flex align-center"><i class="fas fa-times text-danger mr-4"></i> <span data-i18n="attendance.status_absent">Vắng</span></span>
                            <span class="d-flex align-center"><i class="fas fa-exclamation text-warning mr-4"></i> <span data-i18n="attendance.status_excused">Có phép</span></span>
                            <span class="d-flex align-center"><i class="fas fa-clock text-info mr-4"></i> <span data-i18n="attendance.status_late">Đi trễ</span></span>
                        </div>
                    </div>
                    
                    <div class="attendance-table-wrapper" style="overflow-x: auto;">
                        <table class="table attendance-table w-100" style="min-width: 800px;">
                            <thead>
                                <tr>
                                    <th class="sticky-col" data-i18n="students.student">Học sinh</th>
        `;
        
        for (let i = 1; i <= 10; i++) {
            const session = sessions.find(s => s.number === i) || { date: '' };
            const dateStr = session.date ? App.formatDate(session.date) : '';
            html += `
                                    <th class="center" style="min-width: 60px;">
                                        <span data-i18n="batches.session">Buổi</span> ${i}
                                        ${dateStr ? `<div class="text-xs text-muted font-normal mt-4">${dateStr}</div>` : ''}
                                    </th>
            `;
        }
        
        html += `
                                    <th class="right" data-i18n="attendance.rate">Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        enrolledStudents.forEach(student => {
            const stats = Storage.getStudentAttendanceStats(batchId, student.id) || { rate: 0 };
            
            let rateColor = 'text-danger';
            if (stats.rate > 80) rateColor = 'text-success';
            else if (stats.rate > 50) rateColor = 'text-warning';
            
            html += `
                                <tr>
                                    <td class="sticky-col">
                                        <div class="font-medium">${App.escapeHtml(student.name)}</div>
                                    </td>
            `;
            
            for (let i = 1; i <= 10; i++) {
                const status = Storage.getAttendance(batchId, student.id, i);
                let btnClass = '';
                let iconClass = '';
                
                if (status === 'present') { btnClass = 'present'; iconClass = 'fas fa-check text-success'; }
                else if (status === 'absent') { btnClass = 'absent'; iconClass = 'fas fa-times text-danger'; }
                else if (status === 'excused') { btnClass = 'excused'; iconClass = 'fas fa-exclamation text-warning'; }
                else if (status === 'late') { btnClass = 'late'; iconClass = 'fas fa-clock text-info'; }
                
                html += `
                                    <td class="center p-8">
                                        <button class="btn btn-icon btn-ghost att-btn ${btnClass}" data-student="${student.id}" data-session="${i}" data-status="${status || ''}">
                                            <i class="${iconClass}"></i>
                                        </button>
                                    </td>
                `;
            }
            
            html += `
                                    <td class="right font-medium ${rateColor}">${stats.rate.toFixed(0)}%</td>
                                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="card mt-20">
                <div class="card-header">
                    <h3 class="card-title" data-i18n="attendance.notes">Ghi chú buổi học</h3>
                </div>
                <div class="card-body">
                    <div class="row">
        `;
        
        for (let i = 1; i <= 10; i++) {
            const note = Storage.getSessionNote(batchId, i) || '';
            html += `
                        <div class="col-12 mb-16">
                            <label class="form-label font-medium"><span data-i18n="batches.session">Buổi</span> ${i}</label>
                            <textarea class="form-textarea session-note-input" rows="2" data-session="${i}" placeholder="${t('attendance.note_placeholder')}">${App.escapeHtml(note)}</textarea>
                        </div>
            `;
        }
        
        html += `
                    </div>
                    <div class="d-flex justify-end mt-16">
                        <button class="btn btn-primary" id="btn-save-notes" data-i18n="attendance.save_notes">Lưu ghi chú</button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        App.translateDOM();
        
        // Event listeners for attendance buttons
        document.querySelectorAll('.att-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const studentId = target.getAttribute('data-student');
                const sessionNum = parseInt(target.getAttribute('data-session'));
                const currentStatus = target.getAttribute('data-status');
                
                let nextStatus = '';
                if (!currentStatus) nextStatus = 'present';
                else if (currentStatus === 'present') nextStatus = 'absent';
                else if (currentStatus === 'absent') nextStatus = 'excused';
                else if (currentStatus === 'excused') nextStatus = 'late';
                else nextStatus = '';
                
                Storage.setAttendance(batchId, studentId, sessionNum, nextStatus);
                
                // Re-render to update rates
                renderInto(containerId, batchId);
            });
        });
        
        // Event listener for saving notes
        const btnSaveNotes = document.getElementById('btn-save-notes');
        if (btnSaveNotes) {
            btnSaveNotes.addEventListener('click', () => {
                const inputs = document.querySelectorAll('.session-note-input');
                inputs.forEach(input => {
                    const sessionNum = parseInt(input.getAttribute('data-session'));
                    const note = input.value;
                    Storage.saveSessionNote(batchId, sessionNum, note);
                });
                App.showToast(t('messages.notes_saved'), 'success');
            });
        }
    }
    
    return { renderInto };
})();
