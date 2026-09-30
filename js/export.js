const ExportManager = (() => {
    async function exportStatement(batchId) {
        if (typeof ExcelJS === 'undefined') {
            App.showToast(t('payment.excel_error'), 'error');
            return;
        }
        if (typeof saveAs === 'undefined') {
            App.showToast(t('payment.filesaver_error'), 'error');
            return;
        }
        
        const batch = Storage.getBatch(batchId);
        if (!batch) return;
        
        const cls = Storage.getClass(batch.classId);
        if (!cls) return;
        
        const enrolledStudents = Storage.getEnrolledStudents(batchId);
        
        let totalDueOverall = 0;
        let totalCollected = 0;
        let totalRemaining = 0;
        
        const studentsData = enrolledStudents.map((student, index) => {
            const totalDue = Storage.getTotalDue(batchId, student.id) || 0;
            const payment = Storage.getPayment(batchId, student.id) || { amountPaid: 0, status: 'unpaid' };
            const remaining = Math.max(0, totalDue - payment.amountPaid);
            
            totalDueOverall += totalDue;
            totalCollected += payment.amountPaid;
            totalRemaining += remaining;
            
            let statusText = t('payment.status_unpaid');
            if (payment.status === 'paid' || remaining <= 0) statusText = t('payment.status_paid');
            else if (payment.status === 'partial' || (payment.amountPaid > 0 && remaining > 0)) statusText = t('payment.status_partial');
            
            return {
                stt: index + 1,
                name: student.name,
                studentId: student.id,
                totalDue: totalDue,
                amountPaid: payment.amountPaid,
                remaining: remaining,
                status: statusText,
                proofImage: payment.proof
            };
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'EduManager';
        const sheet = workbook.addWorksheet(t('payment.report_title'));

        const centerAlign = { vertical: 'middle', horizontal: 'center' };
        const leftAlign = { vertical: 'middle', horizontal: 'left' };
        const rightAlign = { vertical: 'middle', horizontal: 'right' };
        const borderThin = {
            top: {style:'thin'}, left: {style:'thin'},
            bottom: {style:'thin'}, right: {style:'thin'}
        };

        // Tiêu đề báo cáo
        sheet.mergeCells('A1:G1');
        const titleRow = sheet.getCell('A1');
        titleRow.value = t('payment.statement_title');
        titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } };
        titleRow.alignment = centerAlign;

        sheet.mergeCells('A2:G2');
        sheet.getCell('A2').value = t('classes.title') + ': ' + cls.name;
        sheet.getCell('A2').font = { name: 'Arial', size: 12, bold: true };
        sheet.getCell('A2').alignment = leftAlign;

        sheet.mergeCells('A3:G3');
        sheet.getCell('A3').value = t('classes.batch') + ': ' + batch.name;
        sheet.getCell('A3').font = { name: 'Arial', size: 12 };
        sheet.getCell('A3').alignment = leftAlign;

        sheet.mergeCells('A4:G4');
        sheet.getCell('A4').value = t('payment.export_date') + ': ' + App.formatDateTime(new Date().toISOString());
        sheet.getCell('A4').font = { name: 'Arial', size: 11, italic: true };
        sheet.getCell('A4').alignment = leftAlign;

        sheet.addRow([]);

        // Header bảng
        const headerRow = sheet.addRow([t('payment.stt'), t('students.student'), t('payment.total_due'), t('payment.total_collected'), t('payment.outstanding'), t('students.status'), t('payment.proof')]);
        headerRow.height = 25;
        headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B6275' } };
            cell.alignment = centerAlign;
            cell.border = borderThin;
        });

        // Định dạng cột
        sheet.columns = [
            { width: 8 },  // STT
            { width: 30 }, // Họ tên
            { width: 18 }, // Tổng học phí
            { width: 18 }, // Đã thanh toán
            { width: 18 }, // Còn lại
            { width: 15 }, // Trạng thái
            { width: 25 }  // Minh chứng
        ];

        // Đổ dữ liệu
        studentsData.forEach(row => {
            const dataRow = sheet.addRow([row.stt, row.name, row.totalDue, row.amountPaid, row.remaining, row.status, '']);
            dataRow.font = { name: 'Arial', size: 11 };
            dataRow.height = 25; // Default height
            
            dataRow.getCell(1).alignment = centerAlign; // STT
            dataRow.getCell(2).alignment = leftAlign;   // Name
            
            for (let i = 3; i <= 5; i++) {
                const cell = dataRow.getCell(i);
                cell.alignment = rightAlign;
                cell.numFmt = '#,##0" ₫"';
            }
            
            const statusCell = dataRow.getCell(6);
            statusCell.alignment = centerAlign;
            if (row.status === t('payment.status_paid')) statusCell.font = { color: { argb: 'FF28A745' }, bold: true };
            else if (row.status === t('payment.status_partial')) statusCell.font = { color: { argb: 'FFF5A623' }, bold: true };
            else statusCell.font = { color: { argb: 'FFDC3545' }, bold: true };

            dataRow.eachCell((cell) => { cell.border = borderThin; });
            
            // Add image if exists
            if (row.proofImage) {
                // Determine the base URL of the web app dynamically
                let currentUrl = window.location.href.split('?')[0];
                if (currentUrl.endsWith('index.html')) {
                    currentUrl = currentUrl.replace('index.html', '');
                }
                const proofLink = `${currentUrl}?view_proof=${batch.id}_${row.studentId}`;
                
                const linkCell = dataRow.getCell(7);
                linkCell.value = { text: t('payment.view_proof'), hyperlink: proofLink, tooltip: t('payment.click_to_view') };
                linkCell.font = { color: { argb: 'FF0563C1' }, underline: true, name: 'Arial', size: 11 };
                linkCell.alignment = centerAlign;
            }
        });

        // Phần tổng kết
        sheet.addRow([]); // Dòng trống
        const summaryStartRow = sheet.rowCount + 1;
        
        sheet.mergeCells(`A${summaryStartRow}:B${summaryStartRow}`);
        sheet.getCell(`A${summaryStartRow}`).value = t('payment.summary');
        sheet.getCell(`A${summaryStartRow}`).font = { name: 'Arial', size: 12, bold: true };
        sheet.getCell(`A${summaryStartRow}`).alignment = leftAlign;
        
        sheet.addRow(['', t('report.student_count') + ':', enrolledStudents.length + ' ' + t('students.student').toLowerCase()]).getCell(2).font = { bold: true };
        sheet.addRow(['', t('payment.total_due_summary') + ':', totalDueOverall]).getCell(2).font = { bold: true };
        sheet.getRow(sheet.rowCount).getCell(3).numFmt = '#,##0" ₫"';
        
        sheet.addRow(['', t('payment.total_collected_summary') + ':', totalCollected]).getCell(2).font = { bold: true };
        sheet.getRow(sheet.rowCount).getCell(3).numFmt = '#,##0" ₫"';
        
        const remainingRow = sheet.addRow(['', t('payment.total_remaining_summary') + ':', totalRemaining]);
        remainingRow.getCell(2).font = { bold: true };
        remainingRow.getCell(3).numFmt = '#,##0" ₫"';
        remainingRow.getCell(3).font = { color: { argb: 'FFDC3545' }, bold: true };

        // Xuất file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const safeClassName = App.escapeHtml(cls.name).replace(/\s+/g, '_');
        const safeBatchName = App.escapeHtml(batch.name).replace(/\s+/g, '_');
        saveAs(blob, `${safeClassName}_${safeBatchName}.xlsx`);
    }

    return { exportStatement };
})();
