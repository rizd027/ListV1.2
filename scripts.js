// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Google Apps Script Web App URL
    SHEET_API_URL: 'https://script.google.com/macros/s/AKfycbxaPTrcGsO75QUYjVSApm0ls9HoLOJv7CTV61zZueFELOQYzAopbzgxWxEz8Etk4R3W/exec',
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
    userMenuBtn: document.getElementById('userMenuBtn'),
    userDropdown: document.getElementById('userDropdown'),

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
    modalIcon: document.getElementById('modalIcon'),
    submitBtnText: document.getElementById('submitBtnText'),
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Stats
    totalCount: document.getElementById('totalCount'),
    completedCount: document.getElementById('completedCount'),
    watchingCount: document.getElementById('watchingCount'),
    plannedCount: document.getElementById('plannedCount'),
};

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    startSlideshow();
    initializeEventListeners();
    initCustomSelects();
    if (currentUser && currentPass) {
        elements.loginOverlay.classList.add('hidden');
        elements.displayUser.textContent = currentUser;
        loadData();
    } else {
        elements.loginOverlay.classList.remove('hidden');
    }
    setupStatFilters();
    initRevealObserver();
});

let revealObserver;
function initRevealObserver() {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
}

function initializeEventListeners() {
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);

    elements.tabLogin.addEventListener('click', () => switchAuthMode('login'));
    elements.tabRegister.addEventListener('click', () => switchAuthMode('register'));
    elements.togglePassword.addEventListener('click', () => togglePasswordVisibility('passwordInput', elements.togglePassword));

    // FAB and Modal
    if (elements.addBtn) {
        elements.addBtn.addEventListener('click', openAddModal);
    }
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeModal);
    }
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', closeModal);
    }

    elements.closeConfirmModal.addEventListener('click', closeConfirmModal);
    elements.cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    elements.closeAlertBtn.addEventListener('click', () => elements.customAlert.classList.add('hidden'));
    elements.closeAlertBtnOk.addEventListener('click', () => elements.customAlert.classList.add('hidden'));

    elements.dataForm.addEventListener('submit', handleFormSubmit);

    // Search and Filter
    elements.searchInput.addEventListener('input', debounce(() => {
        applyFilters();
    }, 300));

    elements.statusFilter.addEventListener('input', applyFilters);
    elements.categoryFilter.addEventListener('input', applyFilters);

    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Close modals on outside click
    [elements.modal, elements.confirmModal, elements.customAlert].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    });

    // Initialize FAB Dragging
    if (elements.addBtn && typeof initFabDrag === 'function') {
        initFabDrag(elements.addBtn);
    }

    // User Menu
    if (elements.userMenuBtn) {
        elements.userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('show');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.userDropdown && elements.userMenuBtn && !elements.userMenuBtn.contains(e.target)) {
            elements.userDropdown.classList.remove('show');
        }
    });

    // ESC Key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeConfirmModal();
            elements.customAlert.classList.add('hidden');
        }
    });
}

// ===================================
// UI Notification Functions
// ===================================
function updateAuthUI(mode) {
    const isLogin = mode === 'login';
    elements.loginBtn.textContent = isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang';
    elements.authSubtitle.textContent = isLogin ? 'Silakan masuk ke akun Anda' : 'Daftar untuk mulai mengelola';
    lucide.createIcons();
}

function showAlert(title, message, type = 'info') {
    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;
    const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    elements.alertIcon.setAttribute('data-lucide', iconName);
    elements.alertIcon.setAttribute('data-lucide', iconName);
    elements.customAlert.classList.remove('hidden');
    requestAnimationFrame(() => lucide.createIcons());
}

function showToast(message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    const toast = elements.toast;
    toast.classList.remove('active');
    void toast.offsetWidth;
    elements.toastMessage.textContent = message;
    toast.className = `toast active ${type}`;
    const iconName = type === 'success' ? 'check-circle' : (type === 'info' ? 'info' : 'alert-circle');
    elements.toastIcon.setAttribute('data-lucide', iconName);
    requestAnimationFrame(() => lucide.createIcons());
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

// ===================================
// Slideshow Functions
// ===================================
function startSlideshow() {
    const containers = document.querySelectorAll('.slideshow-container');
    containers.forEach(container => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length === 0) return;
        let currentSlide = 0;
        slides.forEach((s, i) => {
            s.classList.remove('active');
            if (i === 0) s.classList.add('active');
        });
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 2000);
    });
}

// ===================================
// Modal Functions
// ===================================
function openAddModal() {
    currentEditId = null;
    elements.dataForm.reset();
    updateCustomSelects();
    elements.editId.value = '';
    elements.modalTitle.textContent = 'Tambah Koleksi';
    elements.modalIcon.setAttribute('data-lucide', 'plus-circle');
    elements.submitBtnText.textContent = 'Simpan';

    const today = new Date().toISOString().split('T')[0];
    elements.dateInput.value = today;
    updateCustomSelects();

    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lucide.createIcons());
    setTimeout(() => elements.titleInput.focus(), 100);
}

function openEditModal(film) {
    currentEditId = film.id;
    elements.modalTitle.textContent = 'Edit Koleksi';
    elements.modalIcon.setAttribute('data-lucide', 'edit-3');
    elements.submitBtnText.textContent = 'Simpan Perubahan';
    elements.editId.value = film.id;
    elements.titleInput.value = film.title;
    elements.typeInput.value = film.type;
    elements.episodesInput.value = film.episodes || '';
    elements.statusInput.value = film.status;
    elements.dateInput.value = film.date ? new Date(film.date).toISOString().split('T')[0] : '';
    elements.notesInput.value = film.notes || '';
    updateCustomSelects();
    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lucide.createIcons());
}

function closeModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    elements.dataForm.reset();
    updateCustomSelects();
    currentEditId = null;
}

function openDeleteModal(id) {
    currentEditId = id;
    elements.confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    elements.confirmModal.classList.add('hidden');
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
                showToast('Pendaftaran berhasil! Silakan login.', 'success');
                switchAuthMode('login');
                elements.passwordInput.value = '';
            } else {
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
    if (mode === 'login') {
        elements.tabLogin.classList.add('active');
        elements.tabRegister.classList.remove('active');
        elements.authFooter.classList.remove('active');
    } else {
        elements.tabLogin.classList.remove('active');
        elements.tabRegister.classList.add('active');
        elements.authFooter.classList.add('active');
    }
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

function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const statusTerm = elements.statusFilter.value;
    const categoryTerm = elements.categoryFilter.value;

    filteredData = filmData.filter(film => {
        const title = film.title ? film.title.toLowerCase() : '';
        const type = film.type ? film.type.toLowerCase() : '';
        const matchesSearch = title.includes(searchTerm) || type.includes(searchTerm);
        const matchesStatus = statusTerm === 'Semua Status' || statusTerm === '' || film.status === statusTerm;
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
        const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.status === 'success') {
            filmData = result.data.map(item => ({
                id: parseInt(item.no),
                title: item.judul || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                rowIndex: item.rowIndex
            }));
            filteredData = [...filmData];
            renderTable();
            updateStats();
        } else {
            throw new Error(result.message || 'Gagal memuat data');
        }
    } catch (error) {
        showToast('Gagal memuat data: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveData(data, action = 'add') {
    if (!currentUser || !currentPass) return;
    const oldFilmData = [...filmData];

    if (action === 'add') {
        data.id = filmData.length > 0 ? Math.max(...filmData.map(f => f.id)) + 1 : 1;
        filmData.push(data);
    } else {
        const index = filmData.findIndex(f => f.id == data.id);
        if (index !== -1) {
            data.rowIndex = filmData[index].rowIndex;
            filmData[index] = data;
        }
    }

    applyFilters();
    updateStats();
    showToast(action === 'add' ? 'Menambah data...' : 'Memperbarui data...', 'info');

    try {
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
        const response = await fetch(url, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            showToast('Sinkronisasi Berhasil!', 'success');
            silentLoadData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        filmData = oldFilmData;
        applyFilters();
        updateStats();
        showAlert('Gagal Sinkron', 'Data gagal dikirim ke server: ' + error.message, 'error');
    }
}

async function deleteData(id) {
    if (!currentUser || !currentPass) return;
    const oldData = [...filmData];
    const targetFilm = filmData.find(f => f.id == id);
    if (!targetFilm) return;

    // Filter out the deleted item
    filmData = filmData.filter(f => f.id != id);

    // Re-index remaining data to match Spreadsheet re-indexing logic
    filmData.forEach((film, index) => {
        film.id = index + 1;
        film.rowIndex = index + 2; // +1 for 1-based, +1 for header
    });

    applyFilters();
    updateStats();
    showToast('Menghapus data...', 'info');

    try {
        const formData = new FormData();
        formData.append('data', JSON.stringify({ rowIndex: targetFilm.rowIndex }));
        const url = `${CONFIG.SHEET_API_URL}?action=delete&user=${encodeURIComponent(currentUser)}&pass=${encodeURIComponent(currentPass)}`;
        const response = await fetch(url, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        showToast('Terhapus dari database', 'success');
        // No need for silentLoadData here since we already updated the state locally
    } catch (error) {
        filmData = oldData;
        applyFilters();
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
                id: parseInt(item.no),
                title: item.judul || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                rowIndex: item.rowIndex
            }));
            applyFilters();
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
        row.classList.add('reveal-row');
        if (revealObserver) revealObserver.observe(row);
    });
    requestAnimationFrame(() => lucide.createIcons());
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
async function handleFormSubmit(e) {
    e.preventDefault();
    hideToastInstantly();

    const hiddenIdVal = elements.editId.value;
    const editId = currentEditId || (hiddenIdVal ? parseInt(hiddenIdVal) : null);

    const data = {
        title: elements.titleInput.value.trim(),
        type: elements.typeInput.value.trim(),
        episodes: elements.episodesInput.value ? parseInt(elements.episodesInput.value) : null,
        status: elements.statusInput.value.trim(),
        date: elements.dateInput.value || null,
        notes: elements.notesInput.value.trim()
    };

    closeModal();

    if (editId) {
        data.id = editId;
        const existing = filmData.find(f => f.id == editId);
        data.rowIndex = existing ? existing.rowIndex : null;
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(status) {
    const map = { 'Selesai': 'status-selesai', 'Sedang Ditonton': 'status-sedang-ditonton', 'Rencana': 'status-rencana', 'Ditunda': 'status-ditunda', 'Drop': 'status-drop' };
    return map[status] || '';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

window.editFilm = id => {
    const film = filmData.find(f => f.id == id);
    if (film) openEditModal(film);
};

window.openDeleteModal = openDeleteModal;

// FAB Dragging logic
function initFabDrag(el) {
    if (!el) return;

    let isDragging = false;
    let startX, startY;
    let initialX, initialY;
    let hasMoved = false;

    // Load saved position
    const savedPos = JSON.parse(localStorage.getItem('fab_position'));
    if (savedPos) {
        // Parse values and ensure they are within current viewport
        let left = parseInt(savedPos.left);
        let top = parseInt(savedPos.top);

        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const rect = el.getBoundingClientRect();

        left = Math.max(10, Math.min(left, winW - rect.width - 10));
        top = Math.max(10, Math.min(top, winH - rect.height - 10));

        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';
    }

    const onStart = (e) => {
        // Only left click for mouse
        if (e.type === 'mousedown' && e.button !== 0) return;

        isDragging = true;
        hasMoved = false;

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        const rect = el.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        el.style.cursor = 'grabbing';
        el.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        let newX = initialX + dx;
        let newY = initialY + dy;

        // Boundary checks
        const rect = el.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        newX = Math.max(0, Math.min(newX, winW - rect.width));
        newY = Math.max(0, Math.min(newY, winH - rect.height));

        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';

        // Prevent scrolling on touch
        if (e.type === 'touchmove') e.preventDefault();
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';
        el.style.transition = '';

        if (hasMoved) {
            localStorage.setItem('fab_position', JSON.stringify({
                left: el.style.left,
                top: el.style.top
            }));
        }
    };

    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    // Prevent click if moved
    el.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);
}

/* ===================================
   Enhanced Draggable FAB Logic
   =================================== */
const fabBtn = document.getElementById('addBtn'); // Pastikan ID sesuai

function setupDraggableFAB() {
    if (!fabBtn) return;

    // Deteksi apakah perangkat mobile
    const isMobile = () => window.innerWidth <= 768;

    if (isMobile()) {
        // Jika Mobile: Hapus semua posisi bekas drag desktop agar kembali ke CSS
        fabBtn.style.top = "";
        fabBtn.style.left = "";
        fabBtn.style.right = "";
        fabBtn.style.bottom = "";
        return; // Hentikan fungsi drag di mobile jika ingin posisi tetap (fixed)
    }

    // Logika Drag untuk Desktop
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    fabBtn.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        fabBtn.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Set posisi baru
        fabBtn.style.top = (fabBtn.offsetTop - pos2) + "px";
        fabBtn.style.left = (fabBtn.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        fabBtn.style.cursor = 'grab';
    }
}

// Jalankan saat load dan saat resize layar
window.addEventListener('load', setupDraggableFAB);
window.addEventListener('resize', setupDraggableFAB);

// ===================================
// Custom Select Logic
// ===================================
function initCustomSelects() {
    const selects = document.querySelectorAll('select.form-input, select.filter-input');

    selects.forEach(select => {
        if (select.parentElement.classList.contains('custom-select-container')) return;

        const container = document.createElement('div');
        container.className = 'custom-select-container';
        if (select.classList.contains('filter-input')) container.classList.add('filter-select');

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';

        // Get initial text
        const selectedOption = select.options[select.selectedIndex];
        trigger.textContent = selectedOption ? selectedOption.textContent : select.placeholder || 'Pilih...';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';

        Array.from(select.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-option';
            if (option.disabled) optDiv.classList.add('disabled');
            if (option.selected) optDiv.classList.add('selected');
            optDiv.textContent = option.textContent;

            optDiv.addEventListener('click', () => {
                if (option.disabled) return;
                select.selectedIndex = index;
                trigger.textContent = option.textContent;

                // Update selected class
                optionsContainer.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                optDiv.classList.add('selected');

                container.classList.remove('active');

                // Trigger change event on native select
                select.dispatchEvent(new Event('change'));
                select.dispatchEvent(new Event('input'));
            });

            optionsContainer.appendChild(optDiv);
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other custom selects
            document.querySelectorAll('.custom-select-container').forEach(c => {
                if (c !== container) c.classList.remove('active');
            });
            container.classList.toggle('active');
        });

        // Wrap select
        select.style.display = 'none';
        select.parentNode.insertBefore(container, select);
        container.appendChild(trigger);
        container.appendChild(optionsContainer);
        container.appendChild(select);
    });

    // Close on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-container').forEach(c => c.classList.remove('active'));
    });
}

// Helper to update custom select display (useful when resetting form or setting values programmatically)
function updateCustomSelects() {
    document.querySelectorAll('.custom-select-container').forEach(container => {
        const select = container.querySelector('select');
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelectorAll('.custom-option');

        if (select && trigger) {
            const selectedOption = select.options[select.selectedIndex];
            trigger.textContent = selectedOption ? selectedOption.textContent : 'Pilih...';

            options.forEach((opt, index) => {
                opt.classList.toggle('selected', index === select.selectedIndex);
            });
        }
    });
}

function setupStatFilters() {
    const statusFilter = document.getElementById('statusFilter');
    if (!statusFilter) return;

    const filterMaps = [
        { id: 'stat-total', value: 'Total' },
        { id: 'stat-completed', value: 'Selesai' },
        { id: 'stat-watching', value: 'Sedang Ditonton' }, // Samakan dengan data Anda
        { id: 'stat-planned', value: 'Rencana' }
    ];

    filterMaps.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            const card = element.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    // 1. Set nilai pada select asli
                    statusFilter.value = item.value;

                    // 2. Update UI Custom Select
                    if (typeof updateCustomSelects === 'function') {
                        updateCustomSelects();
                    }

                    // 3. PANGGIL applyFilters (BUKAN handleSearch)
                    applyFilters();

                    // Feedback visual
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => card.style.transform = '', 100);
                });
            }
        }
    });
}
