const PaymentManager = (() => {
    function renderInto(containerId, batchId) {
        const container = document.getElementById(containerId);
        const batch = Storage.getBatch(batchId);
        if (!batch) return;
        
        const enrolledStudents = Storage.getEnrolledStudents(batchId);
        
        if (enrolledStudents.length === 0) {
            container.innerHTML = `
                <div class="card p-40 text-center empty-state">
                    <i class="fas fa-money-bill-wave text-muted mb-16" style="font-size: 3rem;"></i>
                    <p class="text-muted" data-i18n="payment.no_students">Chưa có học sinh nào. Hãy thêm học sinh để quản lý thanh toán.</p>
                </div>
            `;
            App.translateDOM();
            return;
        }
        
        let totalDueOverall = 0;
        let totalCollected = 0;
        let unpaidStudentsCount = 0;
        let unpaidStudentsData = [];
        
        const paymentsData = [];
        
        enrolledStudents.forEach(student => {
            const totalDue = Storage.getTotalDue(batchId, student.id) || 0;
            const payment = Storage.getPayment(batchId, student.id) || { amountPaid: 0, status: 'unpaid', history: [] };
            
            totalDueOverall += totalDue;
            totalCollected += payment.amountPaid;
            
            const remaining = Math.max(0, totalDue - payment.amountPaid);
            if (remaining > 0) {
                unpaidStudentsCount++;
                unpaidStudentsData.push({
                    student,
                    totalDue,
                    amountPaid: payment.amountPaid,
                    remaining
                });
            }
            
            paymentsData.push({
                student,
                totalDue,
                payment,
                remaining
            });
        });
        
        const outstandingAmount = Math.max(0, totalDueOverall - totalCollected);
        const collectionRate = totalDueOverall > 0 ? ((totalCollected / totalDueOverall) * 100).toFixed(0) : 0;
        
        let html = `
            <div class="stats-grid mb-20">
                <div class="stat-card">
                    <div class="stat-icon bg-light text-muted"><i class="fas fa-file-invoice-dollar"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="payment.total_due">Tổng học phí</div>
                        <div class="stat-value">${App.formatCurrency(totalDueOverall)}</div>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="payment.total_collected">Đã thu</div>
                        <div class="stat-value">${App.formatCurrency(totalCollected)}</div>
                        <div class="stat-sub text-success"><i class="fas fa-chart-pie mr-4"></i> ${collectionRate}%</div>
                    </div>
                </div>
                <div class="stat-card ${outstandingAmount > 0 ? 'danger' : ''}">
                    <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <div class="stat-label" data-i18n="payment.outstanding">Còn lại</div>
                        <div class="stat-value">${App.formatCurrency(outstandingAmount)}</div>
                    </div>
                </div>
            </div>
        `;
        
        if (unpaidStudentsCount > 0) {
            html += `
                <div class="reminder-box p-16 mb-20 bg-warning-light border-radius d-flex justify-between align-center">
                    <div>
                        <i class="fas fa-bell text-warning mr-8"></i>
                        <strong><span data-i18n="payment.unpaid_reminder_prefix">Có</span> ${unpaidStudentsCount} <span data-i18n="payment.unpaid_reminder_suffix">học sinh chưa hoàn thành học phí.</span></strong>
                    </div>
                    <button class="btn btn-warning btn-sm" id="btn-create-reminder">
                        <i class="fas fa-paper-plane mr-8"></i> <span data-i18n="payment.create_reminder">Tạo nhắc nhở</span>
                    </button>
                </div>
            `;
        }
        
        html += `
            <div class="card">
                <div class="card-header d-flex justify-between align-center">
                    <h3 class="card-title" data-i18n="payment.list_title">Danh sách thanh toán</h3>
                    ${typeof ExportManager !== 'undefined' ? `
                        <button class="btn btn-secondary btn-sm" id="btn-export-statement">
                            <i class="fas fa-download mr-8"></i> <span data-i18n="payment.export">Xuất file</span>
                        </button>
                    ` : ''}
                </div>
                <div class="card-body p-0">
                    <div class="table-wrapper">
                        <table class="table w-100">
                            <thead>
                                <tr>
                                    <th data-i18n="students.student">Học sinh</th>
                                    <th class="right" data-i18n="payment.total_due">Tổng học phí</th>
                                    <th class="right" data-i18n="payment.total_collected">Đã thanh toán</th>
                                    <th class="right" data-i18n="payment.outstanding">Còn lại</th>
                                    <th class="center" data-i18n="students.status">Trạng thái</th>
                                    <th class="center" data-i18n="payment.proof">Minh chứng</th>
                                    <th class="right" data-i18n="common.actions">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        paymentsData.forEach(item => {
            let statusBadge = '';
            let statusText = '';
            if (item.payment.status === 'paid' || item.remaining <= 0) {
                statusBadge = 'badge-success';
                statusText = t('payment.status_paid');
            } else if (item.payment.status === 'partial' || (item.payment.amountPaid > 0 && item.remaining > 0)) {
                statusBadge = 'badge-warning';
                statusText = t('payment.status_partial');
            } else {
                statusBadge = 'badge-danger';
                statusText = t('payment.status_unpaid');
            }
            
            const proofHtml = item.payment.proof ? 
                `<img src="${item.payment.proof}" class="proof-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="App.showImagePreview('${item.payment.proof}')">` : 
                '-';
                
            html += `
                                <tr>
                                    <td class="font-medium">${App.escapeHtml(item.student.name)}</td>
                                    <td class="right">${App.formatCurrency(item.totalDue)}</td>
                                    <td class="right text-success">${App.formatCurrency(item.payment.amountPaid)}</td>
                                    <td class="right ${item.remaining > 0 ? 'text-danger' : ''}">${App.formatCurrency(item.remaining)}</td>
                                    <td class="center"><span class="badge ${statusBadge}">${statusText}</span></td>
                                    <td class="center">${proofHtml}</td>
                                    <td class="right">
                                        <button class="btn btn-icon btn-ghost btn-history" data-student="${item.student.id}" title="${t('payment.history_title')}">
                                            <i class="fas fa-history text-info"></i>
                                        </button>
                                        <button class="btn btn-primary btn-sm btn-pay" data-student="${item.student.id}">
                                            <span data-i18n="payment.pay_btn">Thanh toán</span>
                                        </button>
                                    </td>
                                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        App.translateDOM();
        
        // Event Listeners
        if (document.getElementById('btn-create-reminder')) {
            document.getElementById('btn-create-reminder').addEventListener('click', () => {
                showReminderModal(unpaidStudentsData);
            });
        }
        
        if (document.getElementById('btn-export-statement')) {
            document.getElementById('btn-export-statement').addEventListener('click', () => {
                if (typeof ExportManager !== 'undefined') {
                    ExportManager.exportStatement(batchId);
                }
            });
        }
        
        document.querySelectorAll('.btn-pay').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-student');
                const pData = paymentsData.find(p => p.student.id === studentId);
                showPaymentModal(batchId, pData, containerId);
            });
        });
        
        document.querySelectorAll('.btn-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.getAttribute('data-student');
                const pData = paymentsData.find(p => p.student.id === studentId);
                showHistoryModal(pData);
            });
        });
    }
    
    function showPaymentModal(batchId, paymentData, containerId) {
        let proofBase64 = '';
        
        const bodyHtml = `
            <div class="mb-16">
                <p><span data-i18n="students.student">Học sinh</span>: <strong>${App.escapeHtml(paymentData.student.name)}</strong></p>
                <p><span data-i18n="payment.need_to_pay">Cần thanh toán</span>: <strong class="text-danger">${App.formatCurrency(paymentData.remaining)}</strong></p>
            </div>
            
            <div class="form-group mb-16">
                <label class="form-label" data-i18n="payment.amount_input">Số tiền thanh toán (VNĐ) *</label>
                <input type="number" id="pay-amount" class="form-input" value="${paymentData.remaining}" min="0" step="1000">
            </div>
            
            <div class="form-group mb-16">
                <label class="form-label" data-i18n="payment.proof">Minh chứng (Hình ảnh)</label>
                <input type="file" id="pay-proof" class="file-upload" accept="image/*">
                <div id="proof-preview-container" class="mt-8" style="display: none; text-align: center;">
                    <img id="proof-preview-image" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-md); border: 1px solid var(--border); box-shadow: var(--shadow-sm);" />
                </div>
            </div>
            
            <div class="form-group mb-16">
                <label class="form-label" data-i18n="payment.note_input">Ghi chú</label>
                <textarea id="pay-note" class="form-textarea" rows="2" placeholder="${t('payment.note_placeholder')}"></textarea>
            </div>
        `;
        
        const footerHtml = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.cancel">Hủy</button>
            <button class="btn btn-primary" id="btn-save-payment" data-i18n="common.confirm">Xác nhận</button>
        `;
        
        App.showModal(t('payment.record_payment'), bodyHtml, footerHtml);
        setTimeout(() => App.translateDOM(), 0);
        
        document.getElementById('pay-proof').addEventListener('change', (e) => {
            const file = e.target.files[0];
            const previewContainer = document.getElementById('proof-preview-container');
            const previewImage = document.getElementById('proof-preview-image');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    proofBase64 = e.target.result;
                    if (previewContainer && previewImage) {
                        previewImage.src = proofBase64;
                        previewContainer.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            } else {
                proofBase64 = '';
                if (previewContainer) {
                    previewContainer.style.display = 'none';
                }
            }
        });
        
        document.getElementById('btn-save-payment').addEventListener('click', () => {
            const amountInput = parseFloat(document.getElementById('pay-amount').value) || 0;
            const noteInput = document.getElementById('pay-note').value;
            
            if (amountInput <= 0) {
                App.showToast(t('messages.invalid_amount'), 'error');
                return;
            }
            
            const existingPayment = Storage.getPayment(batchId, paymentData.student.id) || { amountPaid: 0, status: 'unpaid', history: [] };
            
            const newTotalPaid = existingPayment.amountPaid + amountInput;
            let newStatus = 'unpaid';
            if (newTotalPaid >= paymentData.totalDue) {
                newStatus = 'paid';
            } else if (newTotalPaid > 0) {
                newStatus = 'partial';
            }
            
            const newHistoryItem = {
                id: App.generateId('pay'),
                date: new Date().toISOString(),
                amount: amountInput,
                note: noteInput,
                proof: proofBase64
            };
            
            const updatedPayment = {
                amountPaid: newTotalPaid,
                status: newStatus,
                proof: proofBase64 || existingPayment.proof,
                history: [...(existingPayment.history || []), newHistoryItem]
            };
            
            Storage.savePayment(batchId, paymentData.student.id, updatedPayment);
            
            App.closeModal();
            App.showToast(t('messages.payment_saved'), 'success');
            renderInto(containerId, batchId);
        });
    }
    
    function showHistoryModal(paymentData) {
        const history = paymentData.payment.history || [];
        
        let bodyHtml = `
            <div class="mb-16">
                <p><span data-i18n="students.student">Học sinh</span>: <strong>${App.escapeHtml(paymentData.student.name)}</strong></p>
                <p><span data-i18n="payment.total_collected">Tổng đã thanh toán</span>: <strong class="text-success">${App.formatCurrency(paymentData.payment.amountPaid)}</strong></p>
            </div>
        `;
        
        if (history.length === 0) {
            bodyHtml += `<p class="text-muted italic" data-i18n="payment.no_history">Chưa có lịch sử thanh toán.</p>`;
        } else {
            bodyHtml += `
                <div class="table-wrapper">
                    <table class="table w-100">
                        <thead>
                            <tr>
                                <th data-i18n="payment.time">Thời gian</th>
                                <th class="right" data-i18n="payment.amount_input">Số tiền</th>
                                <th data-i18n="payment.note_input">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Sort history newest first
            const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            sortedHistory.forEach(item => {
                bodyHtml += `
                            <tr>
                                <td>${App.formatDateTime(item.date)}</td>
                                <td class="right font-medium text-success">${App.formatCurrency(item.amount)}</td>
                                <td>${App.escapeHtml(item.note || '-')}</td>
                            </tr>
                `;
            });
            
            bodyHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const footerHtml = `<button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.close">Đóng</button>`;
        App.showModal(t('payment.history_title'), bodyHtml, footerHtml);
        setTimeout(() => App.translateDOM(), 0);
    }
    
    function showReminderModal(unpaidStudentsData) {
        let text = t('payment.reminder_template_prefix') + '\n\n';
        
        unpaidStudentsData.forEach((item, index) => {
            text += `${index + 1}. ${t('payment.reminder_student_prefix')} ${item.student.name} - ${t('payment.reminder_amount_prefix')} ${App.formatCurrency(item.remaining)}\n`;
        });
        
        text += '\n' + t('payment.reminder_template_suffix');
        
        const bodyHtml = `
            <p class="mb-12 text-muted" data-i18n="payment.reminder_note">Mẫu tin nhắn nhắc nhở thanh toán. Bạn có thể sao chép và gửi qua Zalo/SMS.</p>
            <div class="copy-area p-16 bg-light border-radius">
                <textarea id="reminder-text" class="w-100 p-8 border-radius" rows="8" style="border: 1px solid var(--border-color); resize: vertical;">${text}</textarea>
            </div>
        `;
        
        const footerHtml = `
            <button class="btn btn-secondary" onclick="App.closeModal()" data-i18n="common.close">Đóng</button>
            <button class="btn btn-primary" id="btn-copy-reminder"><i class="fas fa-copy mr-8"></i> <span data-i18n="common.copy">Sao chép</span></button>
        `;
        
        App.showModal(t('payment.create_reminder'), bodyHtml, footerHtml);
        setTimeout(() => App.translateDOM(), 0);
        
        document.getElementById('btn-copy-reminder').addEventListener('click', () => {
            const copyText = document.getElementById('reminder-text');
            copyText.select();
            copyText.setSelectionRange(0, 99999);
            document.execCommand('copy');
            App.showToast(t('messages.copied_to_clipboard'), 'success');
        });
    }
    
    return { renderInto };
})();
