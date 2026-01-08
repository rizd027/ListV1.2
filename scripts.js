// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Google Apps Script Web App URL
    SHEET_API_URL: 'https://script.google.com/macros/s/AKfycbxEtBXnW4_Jlc4LorGuHg3_FU6a6D6bDpbvNIz_qi4Kb7CmQeSRQgmNzM19Q33x5Q/exec',
    // Set to false to use Google Sheets, true to use localStorage for testing
    USE_LOCAL_STORAGE: false
};

// ===================================
// State Management
// ===================================
let filmData = [];
let filteredData = [];
let currentEditId = null;
let sortColumn = 'id';
let sortDirection = 'asc';
let currentUser = localStorage.getItem('film_username') || null;
let currentPass = localStorage.getItem('film_password') || null;
let authMode = 'login';
let toastTimeout = null;

// ===================================
// DOM Elements
// ===================================
const elements = {
    loginOverlay: document.getElementById('loginOverlay'),
    authTitle: document.getElementById('authTitle'),
    authSubtitle: document.getElementById('authSubtitle'),
    tabLogin: document.getElementById('tabLogin'),
    tabRegister: document.getElementById('tabRegister'),
    usernameInput: document.getElementById('usernameInput'),
    passwordInput: document.getElementById('passwordInput'),
    togglePassword: document.getElementById('togglePassword'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    displayUser: document.getElementById('displayUser'),
    authFooter: document.querySelector('.auth-footer'),

    // Custom Alert
    customAlert: document.getElementById('customAlert'),
    alertTitle: document.getElementById('alertTitle'),
    alertMessage: document.getElementById('alertMessage'),
    alertIcon: document.getElementById('alertIcon'),
    closeAlertBtn: document.getElementById('closeAlertBtn'),
    closeAlertBtnOk: document.getElementById('closeAlertBtnOk'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon'),

    // Buttons
    addBtn: document.getElementById('addBtn'),
    closeModal: document.getElementById('closeModal'),
    cancelBtn: document.getElementById('cancelBtn'),
    closeConfirmModal: document.getElementById('closeConfirmModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // Forms
    dataForm: document.getElementById('dataForm'),

    // Inputs
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    categoryFilter: document.getElementById('categoryFilter'),

    // Form Inputs
    editId: document.getElementById('editId'),
    titleInput: document.getElementById('titleInput'),
    typeInput: document.getElementById('typeInput'),
    episodesInput: document.getElementById('episodesInput'),
    statusInput: document.getElementById('statusInput'),
    dateInput: document.getElementById('dateInput'),
    notesInput: document.getElementById('notesInput'),

    // Display
    tableBody: document.getElementById('tableBody'),
    emptyState: document.getElementById('emptyState'),
    modal: document.getElementById('modal'),
    confirmModal: document.getElementById('confirmModal'),
    modalTitle: document.getElementById('modalTitle'),
    submitBtnText: document.getElementById('submitBtnText'),
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Stats
    totalCount: document.getElementById('totalCount'),
    completedCount: document.getElementById('completedCount'),
    watchingCount: document.getElementById('watchingCount'),
    plannedCount: document.getElementById('plannedCount')
};

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    startSlideshow();
    initializeEventListeners();
    if (currentUser && currentPass) {
        elements.loginOverlay.classList.add('hidden');
        elements.displayUser.textContent = currentUser;
        loadData();
    } else {
        elements.loginOverlay.classList.remove('hidden');
    }
});

function initializeEventListeners() {
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);

    elements.tabLogin.addEventListener('click', () => switchAuthMode('login'));
    elements.tabRegister.addEventListener('click', () => switchAuthMode('register'));
    elements.togglePassword.addEventListener('click', () => togglePasswordVisibility('passwordInput', elements.togglePassword));

    // Pasang Event Listeners
    fab.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    fab.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    elements.addBtn.addEventListener('click', toggleAddModal);
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.closeConfirmModal.addEventListener('click', closeConfirmModal);
    elements.cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    elements.closeAlertBtn.addEventListener('click', () => elements.customAlert.classList.add('hidden'));
    elements.closeAlertBtnOk.addEventListener('click', () => elements.customAlert.classList.add('hidden'));

    elements.dataForm.addEventListener('submit', handleFormSubmit);

    // Ganti bagian search dan filter dengan ini:
    elements.searchInput.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));

    // Gunakan event 'change' atau 'input' agar saat memilih dari datalist langsung terfilter
    elements.statusFilter.addEventListener('input', applyFilters);
    elements.categoryFilter.addEventListener('input', applyFilters);

    elements.statusFilter.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));

    elements.categoryFilter.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    [elements.modal, elements.confirmModal, elements.customAlert].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });
    // Pastikan tombol FAB memanggil fungsi openAddModal
    if (elements.addBtn) {
        elements.addBtn.addEventListener('click', openAddModal);
    }

    // Tombol silang (X) di pojok modal
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeModal);
    }

    // Tombol Batal di dalam form
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', closeModal);
    }

    // Menutup modal jika area di luar box modal di-klik (Overlay)
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeModal();
        }
    });

    // Initialize FAB Dragging
    if (elements.addBtn) {
        initFabDrag(elements.addBtn);
    }
}

// ===================================
// UI Notification Functions
// ===================================
function updateAuthUI(mode) {
    const isLogin = mode === 'login';

    // Update teks secara instan tanpa animasi
    elements.loginBtn.textContent = isLogin ? 'Masuk' : 'Daftar';
    elements.authSubtitle.textContent = isLogin ? 'Silakan masuk ke akun Anda' : 'Daftar untuk mulai mengelola';
    lucide.createIcons();
}

function showAlert(title, message, type = 'info') {
    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;

    const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    elements.alertIcon.setAttribute('data-lucide', iconName);
    elements.customAlert.classList.remove('hidden');
    lucide.createIcons();
}

function showToast(message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);

    const toast = elements.toast;

    // Reset status toast agar bisa langsung muncul kembali jika dipicu berulang kali
    toast.classList.remove('active');

    // Force reflow agar animasi restart (opsional)
    void toast.offsetWidth;

    elements.toastMessage.textContent = message;
    toast.className = `toast active ${type}`;

    const iconName = type === 'success' ? 'check-circle' : (type === 'info' ? 'info' : 'alert-circle');
    elements.toastIcon.setAttribute('data-lucide', iconName);
    lucide.createIcons();

    // Sembunyikan setelah 3 detik
    toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function hideToastInstantly() {
    if (toastTimeout) clearTimeout(toastTimeout);
    elements.toast.classList.remove('active');
}

function showLoading(message = 'Memuat...') {
    elements.loadingOverlay.querySelector('.loading-text').textContent = message;
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    setTimeout(() => {
        elements.loadingOverlay.classList.add('hidden');
    }, 200);
}


/* Picture Slide Show */
function startSlideshow() {
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) {
        console.error("Slideshow: Tidak ada gambar dengan class '.slide' ditemukan.");
        return;
    }

    let currentSlide = 0;

    // Pastikan hanya satu gambar yang punya class active di awal
    slides.forEach((slide, index) => {
        if (index === 0) slide.classList.add('active');
        else slide.classList.remove('active');
    });

    setInterval(() => {
        // 1. Hilangkan class active dari gambar saat ini
        slides[currentSlide].classList.remove('active');

        // 2. Hitung index berikutnya
        currentSlide = (currentSlide + 1) % slides.length;

        // 3. Tambahkan class active ke gambar berikutnya
        slides[currentSlide].classList.add('active');
    }, 2000); // Berganti setiap 4 detik
}

// ===================================
// Auth & Data API Functions
// ===================================
async function handleLogin() {
    const user = elements.usernameInput.value.trim().toLowerCase();
    const pass = elements.passwordInput.value.trim();

    if (!user || !pass) {
        showToast('Username dan Password wajib diisi!', 'error');
        return;
    }

    const cleanUser = user.replace(/[^a-z0-9]/g, '_');
    showLoading(authMode === 'login' ? 'Logging In...' : 'Registering...');

    try {
        const url = `${CONFIG.SHEET_API_URL}?action=${authMode}&user=${encodeURIComponent(cleanUser)}&pass=${encodeURIComponent(pass)}`;
        const response = await fetch(url, { method: 'POST' });
        const result = await response.json();

        if (result.status === 'success') {
            if (authMode === 'register') {
                // PERBAIKAN: Jika daftar berhasil, arahkan ke login
                showToast('Pendaftaran berhasil! Silakan login.', 'success');
                switchAuthMode('login');
                // Kosongkan input password untuk keamanan
                elements.passwordInput.value = '';
            } else {
                // Jika login berhasil
                showToast('Berhasil Masuk!', 'success');
                localStorage.setItem('film_username', cleanUser);
                localStorage.setItem('film_password', pass);
                currentUser = cleanUser;
                currentPass = pass;

                setTimeout(() => {
                    elements.loginOverlay.classList.add('hidden');
                    elements.displayUser.textContent = currentUser;
                    loadData();
                }, 500);
            }
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Koneksi gagal atau server error', 'error');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    localStorage.removeItem('film_username');
    localStorage.removeItem('film_password');
    location.reload();
}

function switchAuthMode(mode) {
    authMode = mode;

    // Update Tab Active State
    if (mode === 'login') {
        elements.tabLogin.classList.add('active');
        elements.tabRegister.classList.remove('active');
        elements.authFooter.classList.remove('active');
    } else {
        elements.tabLogin.classList.remove('active');
        elements.tabRegister.classList.add('active');
        elements.authFooter.classList.add('active');
    }
    lucide.createIcons();
    updateAuthUI(mode);
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i, svg');
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    }
}

// Pastikan fungsi applyFilters() mengambil .value dengan benar
function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const statusTerm = elements.statusFilter.value;
    const categoryTerm = elements.categoryFilter.value;

    filteredData = filmData.filter(film => {
        // PERBAIKAN: Gunakan 'type' karena di loadData Anda menggunakan properti 'type'
        const title = film.title ? film.title.toLowerCase() : '';
        const type = film.type ? film.type.toLowerCase() : '';

        const matchesSearch = title.includes(searchTerm) || type.includes(searchTerm);

        // Logika filter status
        const matchesStatus = statusTerm === 'Semua Status' || statusTerm === '' || film.status === statusTerm;

        // PERBAIKAN: Filter kategori harus memeriksa properti 'type'
        const matchesCategory = categoryTerm === 'Semua Kategori' || categoryTerm === '' || film.type === categoryTerm;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    renderTable();
    updateStats();
}

async function loadData() {
    if (!currentUser || !currentPass) return;
    showLoading('Loading Data...');

    try {
        if (CONFIG.USE_LOCAL_STORAGE) {
            const stored = localStorage.getItem(`filmData_${currentUser}`);
            filmData = stored ? JSON.parse(stored) : [];
        } else {
            const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.status === 'success') {
                filmData = result.data.map(item => ({
                    id: item.no,
                    title: item.judul || '',
                    type: item.type || '', // Ini digunakan sebagai 'Kategori' di filter
                    episodes: item.episode || null,
                    status: item.status || '',
                    date: item.date || null,
                    notes: item.notes || '',
                    rowIndex: item.rowIndex
                }));
            } else {
                throw new Error(result.message || 'Gagal memuat data');
            }
        }

        filteredData = [...filmData];
        renderTable();
        updateStats();
    } catch (error) {
        showToast('Gagal memuat data: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveData(data, action = 'add') {
    if (!currentUser || !currentPass) return;

    // --- STRATEGI OPTIMISTIC UI ---
    // Simpan data lama untuk backup jika gagal
    const oldFilmData = [...filmData];

    if (action === 'add') {
        // Berikan ID sementara agar bisa langsung muncul di tabel
        data.id = filmData.length > 0 ? Math.max(...filmData.map(f => f.id)) + 1 : 1;
        data.isPending = true; // Tandai bahwa ini sedang diproses
        filmData.push(data);
    } else {
        const index = filmData.findIndex(f => f.id === data.id);
        if (index !== -1) {
            data.rowIndex = filmData[index].rowIndex; // Pertahankan rowIndex
            filmData[index] = data;
        }
    }

    // Update UI seketika
    applyFilters(elements.searchInput.value.toLowerCase());
    updateStats();
    showToast(action === 'add' ? 'Menambah data...' : 'Memperbarui data...', 'info');

    // --- PROSES LATAR BELAKANG ---
    try {
        if (CONFIG.USE_LOCAL_STORAGE) {
            localStorage.setItem(`filmData_${currentUser}`, JSON.stringify(filmData));
            showToast('Tersimpan secara lokal', 'success');
        } else {
            const sheetData = {
                no: data.id,
                judul: data.title,
                type: data.type,
                episode: data.episodes,
                status: data.status,
                date: data.date,
                notes: data.notes,
                rowIndex: data.rowIndex
            };

            const formData = new FormData();
            formData.append('data', JSON.stringify(sheetData));

            const url = `${CONFIG.SHEET_API_URL}?action=${action}&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;

            // fetch berjalan di latar belakang (tanpa await showLoading)
            const response = await fetch(url, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.status === 'success') {
                showToast('Sinkronisasi Berhasil!', 'success');
                // Ambil ulang data hanya untuk memastikan rowIndex terbaru tersinkron
                silentLoadData();
            } else {
                throw new Error(result.message);
            }
        }
    } catch (error) {
        // Jika gagal, kembalikan ke data lama (Rollback)
        filmData = oldFilmData;
        applyFilters(elements.searchInput.value.toLowerCase());
        updateStats();
        showAlert('Gagal Sinkron', 'Data gagal dikirim ke server: ' + error.message, 'error');
    }
}

async function deleteData(id) {
    if (!currentUser || !currentPass) return;

    const oldData = [...filmData];
    const targetFilm = filmData.find(f => f.id === id);
    if (!targetFilm) return;

    // Update UI Seketika (Hapus dari memori)
    filmData = filmData.filter(f => f.id !== id);
    applyFilters(elements.searchInput.value.toLowerCase());
    updateStats();
    showToast('Menghapus data...', 'info');

    try {
        if (CONFIG.USE_LOCAL_STORAGE) {
            localStorage.setItem(`filmData_${currentUser}`, JSON.stringify(filmData));
        } else {
            const formData = new FormData();
            formData.append('data', JSON.stringify({ rowIndex: targetFilm.rowIndex }));
            const url = `${CONFIG.SHEET_API_URL}?action=delete&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;

            const response = await fetch(url, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.status !== 'success') throw new Error(result.message);
            showToast('Terhapus dari database', 'success');
        }
    } catch (error) {
        // Rollback jika gagal
        filmData = oldData;
        applyFilters(elements.searchInput.value.toLowerCase());
        updateStats();
        showToast('Gagal menghapus di server', 'error');
    }
}

async function silentLoadData() {
    try {
        const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            filmData = result.data.map(item => ({
                id: item.no,
                title: item.judul || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                rowIndex: item.rowIndex
            }));
            applyFilters(elements.searchInput.value.toLowerCase());
            updateStats();
        }
    } catch (e) {
        console.log("Silent update failed");
    }
}

// ===================================
// UI Rendering
// ===================================
function renderTable() {
    elements.tableBody.innerHTML = '';
    if (filteredData.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    elements.emptyState.classList.add('hidden');

    filteredData.forEach(film => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID">#${film.id}</td>
            <td data-label="Judul"><strong>${escapeHtml(film.title)}</strong></td>
            <td data-label="Tipe"><span class="type-tag">${escapeHtml(film.type)}</span></td>
            <td data-label="Episode">${film.episodes || '-'}</td>
            <td data-label="Status"><span class="status-badge ${getStatusClass(film.status)}">${escapeHtml(film.status)}</span></td>
            <td data-label="Tanggal">${film.date ? formatDate(film.date) : '-'}</td>
            <td data-label="Aksi">
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editFilm(${film.id})"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon delete" onclick="openDeleteModal(${film.id})"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        elements.tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function updateStats() {
    elements.totalCount.textContent = filmData.length;
    elements.completedCount.textContent = filmData.filter(f => f.status === 'Selesai').length;
    elements.watchingCount.textContent = filmData.filter(f => f.status === 'Sedang Ditonton').length;
    elements.plannedCount.textContent = filmData.filter(f => f.status === 'Rencana').length;
}

// ===================================
// Handlers
// ===================================
// ===================================
// Handlers (REVISI)
// ===================================

// Ganti nama fungsi agar lebih sesuai dengan fungsinya saat ini
function toggleAddModal() {
    // Cek apakah modal sedang tersembunyi
    const isHidden = elements.modal.classList.contains('hidden');

    if (isHidden) {
        // LOGIKA MEMBUKA MODAL
        currentEditId = null;
        elements.dataForm.reset();
        elements.editId.value = '';
        elements.modalTitle.textContent = 'Tambah Koleksi';
        elements.submitBtnText.textContent = 'Simpan';

        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.value = today;

        elements.modal.classList.remove('hidden');
        lucide.createIcons();

        setTimeout(() => elements.titleInput.focus(), 100);
    } else {
        // LOGIKA MENUTUP MODAL (Jika diklik saat modal sudah terbuka)
        closeModal();
    }
}

function closeModal() {
    elements.modal.classList.add('hidden');
    // Bersihkan form saat ditutup agar tidak ada sisa data saat dibuka lagi
    elements.dataForm.reset();
    currentEditId = null;
}

// Tambahkan logika penutup modal saat menekan tombol ESC di keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeConfirmModal();
        elements.customAlert.classList.add('hidden');
    }
});

function openEditModal(film) {
    currentEditId = film.id;
    elements.modalTitle.textContent = 'Edit Koleksi';
    elements.submitBtnText.textContent = 'Simpan';
    elements.editId.value = film.id;
    elements.titleInput.value = film.title;
    elements.typeInput.value = film.type;
    elements.episodesInput.value = film.episodes || '';
    elements.statusInput.value = film.status;
    elements.dateInput.value = film.date ? new Date(film.date).toISOString().split('T')[0] : '';
    elements.notesInput.value = film.notes || '';
    elements.modal.classList.remove('hidden');
    lucide.createIcons();
}


function openDeleteModal(id) { currentEditId = id; elements.confirmModal.classList.remove('hidden'); }
function closeConfirmModal() { elements.confirmModal.classList.add('hidden'); }

async function handleFormSubmit(e) {
    e.preventDefault();
    hideToastInstantly();
    const data = {
        title: elements.titleInput.value.trim(),
        type: elements.typeInput.value.trim(),
        episodes: elements.episodesInput.value ? parseInt(elements.episodesInput.value) : null,
        status: elements.statusInput.value.trim(),
        date: elements.dateInput.value || null,
        notes: elements.notesInput.value.trim()
    };
    closeModal();
    if (currentEditId) {
        data.id = currentEditId;
        data.rowIndex = filmData.find(f => f.id === currentEditId)?.rowIndex;
        await saveData(data, 'edit');
    } else {
        await saveData(data, 'add');
    }
}

async function confirmDelete() {
    if (currentEditId) {
        hideToastInstantly();
        closeConfirmModal();
        await deleteData(currentEditId);
    }
}

function handleSearch() { applyFilters(elements.searchInput.value.toLowerCase()); }
function handleFilter() { applyFilters(elements.searchInput.value.toLowerCase()); }

function handleSort(column) {
    if (sortColumn === column) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    filteredData.sort((a, b) => {
        let aVal = a[column], bVal = b[column];
        if (aVal == null) return 1; if (bVal == null) return -1;
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        return aVal < bVal ? (sortDirection === 'asc' ? -1 : 1) : (sortDirection === 'asc' ? 1 : -1);
    });
    renderTable();
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

window.editFilm = id => { const film = filmData.find(f => f.id === id); if (film) openEditModal(film); };
window.openDeleteModal = openDeleteModal;

function getStatusClass(status) {
    const map = { 'Selesai': 'status-selesai', 'Sedang Ditonton': 'status-sedang-ditonton', 'Rencana': 'status-rencana', 'Ditunda': 'status-ditunda', 'Drop': 'status-drop' };
    return map[status] || '';
}

function formatDate(date) {
}

async function silentLoadData() {
    try {
        const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            filmData = result.data.map(item => ({
                id: item.no,
                title: item.judul || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                rowIndex: item.rowIndex
            }));
            applyFilters(elements.searchInput.value.toLowerCase());
            updateStats();
        }
    } catch (e) {
        console.log("Silent update failed");
    }
}

// ===================================
// UI Rendering
// ===================================
function renderTable() {
    elements.tableBody.innerHTML = '';
    if (filteredData.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    elements.emptyState.classList.add('hidden');

    filteredData.forEach(film => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID">#${film.id}</td>
            <td data-label="Judul"><strong>${escapeHtml(film.title)}</strong></td>
            <td data-label="Tipe"><span class="type-tag">${escapeHtml(film.type)}</span></td>
            <td data-label="Episode">${film.episodes || '-'}</td>
            <td data-label="Status"><span class="status-badge ${getStatusClass(film.status)}">${escapeHtml(film.status)}</span></td>
            <td data-label="Tanggal">${film.date ? formatDate(film.date) : '-'}</td>
            <td data-label="Aksi">
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editFilm(${film.id})"><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon delete" onclick="openDeleteModal(${film.id})"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        elements.tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function updateStats() {
    elements.totalCount.textContent = filmData.length;
    elements.completedCount.textContent = filmData.filter(f => f.status === 'Selesai').length;
    elements.watchingCount.textContent = filmData.filter(f => f.status === 'Sedang Ditonton').length;
    elements.plannedCount.textContent = filmData.filter(f => f.status === 'Rencana').length;
}

// ===================================
// Handlers
// ===================================
// ===================================
// Handlers (REVISI)
// ===================================

// Ganti nama fungsi agar lebih sesuai dengan fungsinya saat ini
function toggleAddModal() {
    // Cek apakah modal sedang tersembunyi
    const isHidden = elements.modal.classList.contains('hidden');

    if (isHidden) {
        // LOGIKA MEMBUKA MODAL
        currentEditId = null;
        elements.dataForm.reset();
        elements.editId.value = '';
        elements.modalTitle.textContent = 'Tambah Koleksi';
        elements.submitBtnText.textContent = 'Simpan';

        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.value = today;

        elements.modal.classList.remove('hidden');
        lucide.createIcons();

        setTimeout(() => elements.titleInput.focus(), 100);
    } else {
        // LOGIKA MENUTUP MODAL (Jika diklik saat modal sudah terbuka)
        closeModal();
    }
}

function closeModal() {
    elements.modal.classList.add('hidden');
    // Bersihkan form saat ditutup agar tidak ada sisa data saat dibuka lagi
    elements.dataForm.reset();
    currentEditId = null;
}

// Tambahkan logika penutup modal saat menekan tombol ESC di keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeConfirmModal();
        elements.customAlert.classList.add('hidden');
    }
});

function openEditModal(film) {
    currentEditId = film.id;
    elements.modalTitle.textContent = 'Edit Koleksi';
    elements.submitBtnText.textContent = 'Simpan';
    elements.editId.value = film.id;
    elements.titleInput.value = film.title;
    elements.typeInput.value = film.type;
    elements.episodesInput.value = film.episodes || '';
    elements.statusInput.value = film.status;
    elements.dateInput.value = film.date ? new Date(film.date).toISOString().split('T')[0] : '';
    elements.notesInput.value = film.notes || '';
    elements.modal.classList.remove('hidden');
    lucide.createIcons();
}


function openDeleteModal(id) { currentEditId = id; elements.confirmModal.classList.remove('hidden'); }
function closeConfirmModal() { elements.confirmModal.classList.add('hidden'); }

async function handleFormSubmit(e) {
    e.preventDefault();
    hideToastInstantly();
    const data = {
        title: elements.titleInput.value.trim(),
        type: elements.typeInput.value.trim(),
        episodes: elements.episodesInput.value ? parseInt(elements.episodesInput.value) : null,
        status: elements.statusInput.value.trim(),
        date: elements.dateInput.value || null,
        notes: elements.notesInput.value.trim()
    };
    closeModal();
    if (currentEditId) {
        data.id = currentEditId;
        data.rowIndex = filmData.find(f => f.id === currentEditId)?.rowIndex;
        await saveData(data, 'edit');
    } else {
        await saveData(data, 'add');
    }
}

async function confirmDelete() {
    if (currentEditId) {
        hideToastInstantly();
        closeConfirmModal();
        await deleteData(currentEditId);
    }
}

function handleSearch() { applyFilters(elements.searchInput.value.toLowerCase()); }
function handleFilter() { applyFilters(elements.searchInput.value.toLowerCase()); }

function handleSort(column) {
    if (sortColumn === column) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    filteredData.sort((a, b) => {
        let aVal = a[column], bVal = b[column];
        if (aVal == null) return 1; if (bVal == null) return -1;
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        return aVal < bVal ? (sortDirection === 'asc' ? -1 : 1) : (sortDirection === 'asc' ? 1 : -1);
    });
    renderTable();
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

window.editFilm = id => { const film = filmData.find(f => f.id === id); if (film) openEditModal(film); };
window.openDeleteModal = openDeleteModal;

function getStatusClass(status) {
    const map = { 'Selesai': 'status-selesai', 'Sedang Ditonton': 'status-sedang-ditonton', 'Rencana': 'status-rencana', 'Ditunda': 'status-ditunda', 'Drop': 'status-drop' };
    return map[status] || '';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ===================================
// Draggable FAB Logic
// ===================================
const fab = document.getElementById('addBtn');
let isDragging = false;
let startY;
let initialTop;
let dragThreshold = 5; // Toleransi gerakan dalam pixel
let wasDragged = false;

function onStart(e) {
    isDragging = true;
    wasDragged = false; // Reset status setiap kali ditekan

    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    startY = clientY;

    const rect = fab.getBoundingClientRect();
    initialTop = rect.top;

    fab.style.transition = 'none';
}

function onMove(e) {
    if (!isDragging) return;

    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY;

    // Jika gerakan melebihi threshold, tandai sebagai "sedang menggeser"
    if (Math.abs(deltaY) > dragThreshold) {
        wasDragged = true;

        let newTop = initialTop + deltaY;
        const padding = 20;
        const maxTop = window.innerHeight - fab.offsetHeight - padding;

        if (newTop < padding) newTop = padding;
        if (newTop > maxTop) newTop = maxTop;

        fab.style.top = `${newTop}px`;
        fab.style.bottom = 'auto';
    }
}

function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    fab.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    // Kuncinya ada di sini:
    // Jika wasDragged true, kita pasang penghalang klik sementara.
    if (wasDragged) {
        const preventClick = (event) => {
            event.stopImmediatePropagation();
            event.preventDefault();
        };
        // Gunakan {capture: true} dan hilangkan setelah 50ms
        fab.addEventListener('click', preventClick, { capture: true, once: true });
        setTimeout(() => {
            fab.removeEventListener('click', preventClick, { capture: true });
        }, 50);
    }
}



