/**
 * Storage Module — Firebase Firestore + Local Cache
 * 
 * Synchronized with Firestore via onSnapshot.
 * UI accesses data synchronously from `cache` to avoid massive async refactoring.
 */
const Storage = (() => {
    const firebaseConfig = {
      apiKey: "AIzaSyCmktasbzhME40AGzc03ZZ1L1Qm1cmdylI",
      authDomain: "edumanager-f5521.firebaseapp.com",
      projectId: "edumanager-f5521",
      storageBucket: "edumanager-f5521.firebasestorage.app",
      messagingSenderId: "93941975716",
      appId: "1:93941975716:web:f02c23587cc04068f9b431",
      measurementId: "G-FM3SEQ46VY"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const COLLECTIONS = [
        'classes', 'batches', 'students', 'enrollments', 
        'attendance', 'payments', 'sessionNotes'
    ];

    const cache = {};
    COLLECTIONS.forEach(c => cache[c] = {});

    let isInitialized = false;
    let onInitCallbacks = [];
    let currentUid = null;
    let unsubscribeFunctions = [];

    // Helper functions for firestore
    function _set(collection, id, data) {
        if (!id || !currentUid) return;
        cache[collection][id] = data; // Optimistic update
        db.collection('users').doc(currentUid).collection(collection).doc(id).set(data).catch(e => {
            console.error("Error writing to cloud:", e);
            if (window.App && App.showToast) {
                App.showToast(t("messages.error_save_cloud") + ": " + e.message, "error");
            }
        });
    }

    function _delete(collection, id) {
        if (!id || !currentUid) return;
        delete cache[collection][id]; // Optimistic delete
        db.collection('users').doc(currentUid).collection(collection).doc(id).delete().catch(e => {
            console.error("Error deleting from cloud:", e);
            if (window.App && App.showToast) {
                App.showToast(t("messages.error_delete_cloud") + ": " + e.message, "error");
            }
        });
    }

    function _getArray(collection) {
        return Object.values(cache[collection]);
    }

    // --- MIGRATION LOGIC ---
    async function absorbRootData(uid) {
        try {
            // Check if root data has been migrated
            const migrationDoc = await db.collection('system').doc('migration').get();
            if (migrationDoc.exists) {
                return; // Already migrated to some account
            }

            // Check if root classes exist
            const snap = await db.collection('classes').limit(1).get();
            if (snap.empty) {
                // No root data to migrate, just mark it so future accounts don't try
                await db.collection('system').doc('migration').set({ migratedTo: uid, timestamp: new Date() });
                return;
            }

            console.log("Absorbing root data into user account...");
            for (const col of COLLECTIONS) {
                const snapshot = await db.collection(col).get();
                for (const doc of snapshot.docs) {
                    await db.collection('users').doc(uid).collection(col).doc(doc.id).set(doc.data());
                }
            }
            
            // Mark as migrated
            await db.collection('system').doc('migration').set({ migratedTo: uid, timestamp: new Date() });
            console.log("Root data absorption complete!");
        } catch(e) {
            console.error("Migration failed:", e);
        }
    }

    // --- INITIALIZATION ---
    async function init(uid) {
        if (!uid) return;
        currentUid = uid;
        isInitialized = false;
        
        // Clean up previous listeners if any
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions = [];
        
        // Reset cache
        COLLECTIONS.forEach(c => cache[c] = {});

        await absorbRootData(uid);

        let loadedCount = 0;
        COLLECTIONS.forEach(col => {
            const unsub = db.collection('users').doc(uid).collection(col).onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' || change.type === 'modified') {
                        cache[col][change.doc.id] = change.doc.data();
                    }
                    if (change.type === 'removed') {
                        delete cache[col][change.doc.id];
                    }
                });
                
                // Track initial load
                if (!isInitialized) {
                    loadedCount++;
                    if (loadedCount === COLLECTIONS.length) {
                        isInitialized = true;
                        onInitCallbacks.forEach(cb => cb());
                        onInitCallbacks = [];
                    }
                } else {
                    // Optional: trigger re-render on changes if another user edits
                    if (window.App && typeof window.App.reRenderCurrentPage === 'function') {
                         window.App.reRenderCurrentPage(); 
                    }
                }
            });
            unsubscribeFunctions.push(unsub);
        });
    }

    function ready(cb) {
        if (isInitialized) cb();
        else onInitCallbacks.push(cb);
    }

    // ─── Classes ──────────────────────────────────────────
    function getClasses() {
        return _getArray('classes').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    }

    function getClass(id) {
        return cache.classes[id] || null;
    }

    function saveClass(cls) {
        _set('classes', cls.id, cls);
    }

    function deleteClass(id) {
        _delete('classes', id);
        // Also delete related batches
        const batches = getBatchesByClass(id);
        batches.forEach(b => deleteBatch(b.id));
    }

    // ─── Batches ──────────────────────────────────────────
    function getBatches() {
        return _getArray('batches');
    }

    function getBatchesByClass(classId) {
        return _getArray('batches')
            .filter(b => b.classId === classId)
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { numeric: true }));
    }

    function getBatch(id) {
        return cache.batches[id] || null;
    }

    function saveBatch(batch) {
        _set('batches', batch.id, batch);
    }

    function deleteBatch(id) {
        _delete('batches', id);
        // Clean up enrollments, attendance, payments
        _delete('enrollments', id);
        Object.keys(cache.attendance).forEach(key => {
            if (key.startsWith(id + '_')) _delete('attendance', key);
        });
        Object.keys(cache.payments).forEach(key => {
            if (key.startsWith(id + '_')) _delete('payments', key);
        });
        Object.keys(cache.sessionNotes).forEach(key => {
            if (key.startsWith(id + '_')) _delete('sessionNotes', key);
        });
    }

    // ─── Students ─────────────────────────────────────────
    function getStudents() {
        return _getArray('students').sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    function getStudent(id) {
        return cache.students[id] || null;
    }

    function saveStudent(student) {
        _set('students', student.id, student);
    }

    function deleteStudent(id) {
        _delete('students', id);
        // Remove from all enrollments
        Object.keys(cache.enrollments).forEach(batchId => {
            unenrollStudent(batchId, id);
        });
    }

    // ─── Enrollments ──────────────────────────────────────
    function getEnrollments(batchId) {
        const doc = cache.enrollments[batchId];
        return doc ? (doc.studentIds || []) : [];
    }

    function getEnrolledStudents(batchId) {
        const ids = getEnrollments(batchId);
        return ids.map(id => getStudent(id)).filter(Boolean);
    }

    function enrollStudent(batchId, studentId) {
        const doc = cache.enrollments[batchId] || { studentIds: [] };
        if (!doc.studentIds.includes(studentId)) {
            doc.studentIds.push(studentId);
            _set('enrollments', batchId, doc);
        }
    }

    function unenrollStudent(batchId, studentId) {
        const doc = cache.enrollments[batchId];
        if (doc && doc.studentIds) {
            doc.studentIds = doc.studentIds.filter(id => id !== studentId);
            _set('enrollments', batchId, doc);
        }
    }

    // ─── Attendance ───────────────────────────────────────
    function _attKey(batchId, studentId, sessionNum) {
        return `${batchId}_${studentId}_${sessionNum}`;
    }

    function getAttendance(batchId, studentId, sessionNum) {
        const doc = cache.attendance[_attKey(batchId, studentId, sessionNum)];
        return doc ? doc.status : null;
    }

    function getAttendanceForBatch(batchId) {
        const all = cache.attendance;
        const result = {};
        Object.keys(all).forEach(key => {
            if (key.startsWith(batchId + '_')) {
                result[key] = all[key].status;
            }
        });
        return result;
    }

    function setAttendance(batchId, studentId, sessionNum, status) {
        _set('attendance', _attKey(batchId, studentId, sessionNum), { status: status });
    }

    // ─── Payments ─────────────────────────────────────────
    function _payKey(batchId, studentId) {
        return `${batchId}_${studentId}`;
    }

    function getPayment(batchId, studentId) {
        return cache.payments[_payKey(batchId, studentId)] || {
            amountPaid: 0,
            status: 'unpaid',
            proof: '',
            history: []
        };
    }

    function getPaymentsForBatch(batchId) {
        const all = cache.payments;
        const result = {};
        Object.keys(all).forEach(key => {
            if (key.startsWith(batchId + '_')) {
                result[key] = all[key];
            }
        });
        return result;
    }

    function savePayment(batchId, studentId, paymentData) {
        _set('payments', _payKey(batchId, studentId), paymentData);
    }

    // ─── Session Notes ────────────────────────────────────
    function _noteKey(batchId, sessionNum) {
        return `${batchId}_${sessionNum}`;
    }

    function getSessionNote(batchId, sessionNum) {
        const doc = cache.sessionNotes[_noteKey(batchId, sessionNum)];
        return doc ? doc.text : '';
    }

    function saveSessionNote(batchId, sessionNum, note) {
        _set('sessionNotes', _noteKey(batchId, sessionNum), { text: note });
    }

    // ─── Theme ────────────────────────────────────────────
    function getTheme() {
        return localStorage.getItem('qlhs_theme') || 'dark';
    }

    function setTheme(theme) {
        localStorage.setItem('qlhs_theme', theme);
    }

    // ─── Utility ──────────────────────────────────────────
    function generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function getAllData() {
        return {
            classes: cache.classes,
            batches: cache.batches,
            students: cache.students,
            enrollments: cache.enrollments,
            attendance: cache.attendance,
            payments: cache.payments,
            sessionNotes: cache.sessionNotes,
        };
    }

    // ─── Computed helpers ─────────────────────────────────
    function getTotalDue(batchId, studentId) {
        const batch = getBatch(batchId);
        const cls = batch ? getClass(batch.classId) : null;
        if (!batch || !cls) return 0;
        // Count sessions the student attended (present or late)
        let count = 0;
        (batch.sessions || []).forEach(s => {
            const att = getAttendance(batchId, studentId, s.number);
            if (att === 'present' || att === 'late') count++;
        });
        // If no attendance taken yet, charge for all sessions
        const hasAnyAttendance = (batch.sessions || []).some(s =>
            getAttendance(batchId, studentId, s.number) !== null
        );
        if (!hasAnyAttendance) count = (batch.sessions || []).length;
        return count * (cls.pricePerSession || 0);
    }

    function getStudentAttendanceStats(batchId, studentId) {
        const batch = getBatch(batchId);
        if (!batch) return { total: 0, present: 0, absent: 0, excused: 0, late: 0, rate: 0 };
        let present = 0, absent = 0, excused = 0, late = 0, total = 0;
        (batch.sessions || []).forEach(s => {
            const att = getAttendance(batchId, studentId, s.number);
            if (att) {
                total++;
                if (att === 'present') present++;
                else if (att === 'absent') absent++;
                else if (att === 'excused') excused++;
                else if (att === 'late') late++;
            }
        });
        const rate = total > 0 ? ((present + late) / total * 100) : 0;
        return { total, present, absent, excused, late, rate };
    }

    return {
        init, // Export init for app.js to call with uid
        ready, // New export to delay app start until cache is populated
        getClasses, getClass, saveClass, deleteClass,
        getBatches, getBatchesByClass, getBatch, saveBatch, deleteBatch,
        getStudents, getStudent, saveStudent, deleteStudent,
        getEnrollments, getEnrolledStudents, enrollStudent, unenrollStudent,
        getAttendance, getAttendanceForBatch, setAttendance,
        getPayment, getPaymentsForBatch, savePayment,
        getSessionNote, saveSessionNote,
        getTheme, setTheme,
        generateId, getAllData,
        getTotalDue, getStudentAttendanceStats,
    };
})();
