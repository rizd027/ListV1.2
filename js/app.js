import { elements, state } from './state.js';
import { handleLogin, handleLogout, switchAuthMode, togglePasswordVisibility } from './auth.js';
import { loadData, saveData, deleteData } from './api.js';
import { showToast, showAlert, hideToastInstantly } from './ui.js';
import { debounce, escapeHtml, formatDate, getStatusClass } from './utils.js';

// ===================================
// Initialization
// ===================================
window.addEventListener('componentsLoaded', () => {
    startSlideshow();
    initializeEventListeners();
    initCustomSelects();
    setupStatFilters();
    initConfirmModal();

    if (state.currentUser && state.currentPass) {
        if (elements.displayUser) elements.displayUser.textContent = state.currentUser;

        // Only load data if we are on the dashboard (elements.tableBody exists)
        if (elements.tableBody) {
            loadData().then(() => {
                applyFilters();
                updateStats();
            });
        }
    }
});



window.addEventListener('dataLoaded', () => {
    applyFilters();
    updateStats();
});

function initializeEventListeners() {
    if (elements.loginBtn) elements.loginBtn.addEventListener('click', handleLogin);
    if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', handleLogout);

    if (elements.tabLogin) elements.tabLogin.addEventListener('click', () => switchAuthMode('login'));
    if (elements.tabRegister) elements.tabRegister.addEventListener('click', () => switchAuthMode('register'));
    if (elements.togglePassword) elements.togglePassword.addEventListener('click', () => togglePasswordVisibility('passwordInput', elements.togglePassword));

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

    if (elements.closeConfirmModal) elements.closeConfirmModal.addEventListener('click', closeConfirmModal);
    if (elements.cancelDeleteBtn) elements.cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    if (elements.confirmDeleteBtn) elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    if (elements.closeAlertBtn) elements.closeAlertBtn.addEventListener('click', () => elements.customAlert.classList.add('hidden'));
    if (elements.closeAlertBtnOk) elements.closeAlertBtnOk.addEventListener('click', () => elements.customAlert.classList.add('hidden'));

    if (elements.dataForm) elements.dataForm.addEventListener('submit', handleFormSubmit);

    // Trigger date picker when date field is clicked
    if (elements.dateInput) {
        elements.dateInput.addEventListener('click', () => {
            if (typeof elements.dateInput.showPicker === 'function') {
                elements.dateInput.showPicker();
            }
        });
        // Also trigger when the parent field is clicked
        const dateField = elements.dateInput.closest('.mdl-field');
        if (dateField) {
            dateField.style.cursor = 'pointer';
            dateField.addEventListener('click', (e) => {
                if (e.target !== elements.dateInput) {
                    if (typeof elements.dateInput.showPicker === 'function') {
                        elements.dateInput.showPicker();
                    }
                }
            });
        }
    }

    // Search and Filter
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(() => {
            applyFilters();
        }, 300));
    }

    if (elements.statusFilter) elements.statusFilter.addEventListener('input', applyFilters);
    if (elements.categoryFilter) elements.categoryFilter.addEventListener('input', applyFilters);

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

    // User Menu
    if (elements.userMenuBtn) {
        elements.userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.userDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (elements.userDropdown && elements.userMenuBtn && !elements.userMenuBtn.contains(e.target)) {
            elements.userDropdown.classList.remove('show');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeConfirmModal();
            elements.customAlert.classList.add('hidden');
        }
    });

    // FAB Dragging
    if (elements.addBtn) initFabDrag(elements.addBtn);

    // Dynamic Header Glass Effect on Scroll
    window.addEventListener('scroll', () => {
        document.body.classList.toggle('header-scrolled', window.scrollY > 10);
    });

    if (elements.brandLogo) {
        elements.brandLogo.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Bulk Delete Handlers
    const openBulkBtn = document.getElementById('openBulkDeleteBtn');
    const closeBulkBtn = document.getElementById('closeBulkDeleteModal');
    const cancelBulkBtn = document.getElementById('cancelBulkDelete');
    const confirmBulkBtn = document.getElementById('confirmBulkDelete');
    const selectAllBulk = document.getElementById('selectAllBulk');

    if (openBulkBtn) openBulkBtn.addEventListener('click', openBulkDeleteModal);
    if (closeBulkBtn) closeBulkBtn.addEventListener('click', closeBulkDeleteModal);
    if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', closeBulkDeleteModal);
    if (confirmBulkBtn) confirmBulkBtn.addEventListener('click', executeBulkDelete);
    if (selectAllBulk) selectAllBulk.addEventListener('change', toggleSelectAllBulk);
    // Bottom Navigation Handlers (Mobile)
    const navSearch = document.getElementById('navSearch');
    const navAdd = document.getElementById('navAdd');
    const navBulkDelete = document.getElementById('navBulkDelete');

    if (navSearch) {
        navSearch.addEventListener('click', () => {
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    if (elements.searchInput) elements.searchInput.focus();
                }, 500);
            }
        });
    }

    if (navAdd) {
        navAdd.addEventListener('click', () => {
            openAddModal();
        });
    }

    if (navBulkDelete) {
        navBulkDelete.addEventListener('click', () => {
            openBulkDeleteModal();
        });
    }

    if (elements.sortMobile) {
        elements.sortMobile.addEventListener('change', (e) => {
            const [column, direction] = e.target.value.split('-');
            if (column && direction) {
                state.sortColumn = column;
                state.sortDirection = direction;
                applySort();
            }
        });
    }
}







// UI Functions that need local state/elements
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

// Bulk Delete Functions
function openBulkDeleteModal() {
    const modal = document.getElementById('bulkDeleteModal');
    const listContainer = document.getElementById('bulkDeleteList');
    const selectAll = document.getElementById('selectAllBulk');
    const countSpan = document.getElementById('selectedCount');

    if (!modal || !listContainer) return;

    // Reset
    listContainer.innerHTML = '';
    selectAll.checked = false;
    countSpan.textContent = '0';
    state.selectedBulkIds = new Set();

    // Populate list with all data sorted by ID descending
    const allData = [...state.filmData].sort((a, b) => b.id - a.id);

    allData.forEach(film => {
        const item = document.createElement('div');
        item.className = 'bulk-item';
        item.innerHTML = `
            <input type="checkbox" class="bulk-check" value="${film.id}">
            <span class="bulk-id">#${film.id}</span>
            <span class="bulk-title">${escapeHtml(film.title)}</span>
        `;

        // Click on row to toggle checkbox
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const cb = item.querySelector('.bulk-check');
                cb.checked = !cb.checked;
                updateBulkSelection(cb);
            }
        });

        item.querySelector('.bulk-check').addEventListener('change', (e) => updateBulkSelection(e.target));

        listContainer.appendChild(item);
    });

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
}

function closeBulkDeleteModal() {
    const modal = document.getElementById('bulkDeleteModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    state.selectedBulkIds = new Set();
}

function updateBulkSelection(checkbox) {
    const item = checkbox.closest('.bulk-item');
    if (checkbox.checked) {
        state.selectedBulkIds.add(parseInt(checkbox.value));
        item.classList.add('checked');
    } else {
        state.selectedBulkIds.delete(parseInt(checkbox.value));
        item.classList.remove('checked');
    }
    document.getElementById('selectedCount').textContent = state.selectedBulkIds.size;

    // Update Select All state
    const allChecks = document.querySelectorAll('.bulk-check');
    document.getElementById('selectAllBulk').checked = state.selectedBulkIds.size === allChecks.length && allChecks.length > 0;
}

function toggleSelectAllBulk(e) {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('.bulk-check');
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        updateBulkSelection(cb);
    });
}

async function executeBulkDelete() {
    if (state.selectedBulkIds.size === 0) {
        showToast('Pilih setidaknya satu item', 'warning');
        return;
    }

    openConfirmModal({
        title: 'Hapus Banyak?',
        desc: `Anda akan menghapus ${state.selectedBulkIds.size} item secara permanen. Tindakan ini tidak bisa dibatalkan.`,
        onConfirm: async () => {
            const btn = document.getElementById('confirmBulkDelete');
            const originalText = btn.innerHTML;
            btn.textContent = 'Menghapus...';
            btn.disabled = true;

            try {
                const ids = Array.from(state.selectedBulkIds);
                for (const id of ids) {
                    await deleteData(id);
                }
                showToast(`${ids.length} item berhasil dihapus`, 'success');
                closeBulkDeleteModal();
                applyFilters();
                updateStats();
            } catch (error) {
                showAlert('Gagal', 'Terjadi kesalahan saat menghapus: ' + error.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

function openAddModal() {
    state.currentEditId = null;
    elements.dataForm.reset();
    if (elements.castInput) elements.castInput.value = '';
    if (elements.linkInput) elements.linkInput.value = '';
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
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => elements.titleInput.focus(), 100);
}

function openEditModal(film) {
    state.currentEditId = film.id;
    elements.modalTitle.textContent = 'Edit Koleksi';
    elements.modalIcon.setAttribute('data-lucide', 'edit-3');
    elements.submitBtnText.textContent = 'Simpan Perubahan';
    elements.editId.value = film.id;
    elements.titleInput.value = film.title;
    if (elements.castInput) elements.castInput.value = film.cast || '';
    elements.typeInput.value = film.type;
    elements.episodesInput.value = film.episodes || '';
    elements.statusInput.value = film.status;
    elements.dateInput.value = film.date ? new Date(film.date).toISOString().split('T')[0] : '';
    elements.notesInput.value = film.notes || '';
    if (elements.linkInput) elements.linkInput.value = film.link || '';
    updateCustomSelects();
    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
}

function closeModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    elements.dataForm.reset();
    updateCustomSelects();
    state.currentEditId = null;
}

function closeConfirmModal() {
    elements.confirmModal.classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    hideToastInstantly();

    let link = elements.linkInput ? elements.linkInput.value.trim() : '';
    if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
        link = 'https://' + link;
    }

    const data = {
        title: elements.titleInput.value.trim(),
        cast: elements.castInput ? elements.castInput.value.trim() : '',
        type: elements.typeInput.value.trim(),
        episodes: elements.episodesInput.value ? parseInt(elements.episodesInput.value) : null,
        status: elements.statusInput.value.trim(),
        date: elements.dateInput.value || null,
        notes: elements.notesInput.value.trim(),
        link: link
    };
    const editId = state.currentEditId;
    closeModal();

    try {
        if (editId) {
            data.id = editId;
            await saveData(data, 'edit');
        } else {
            await saveData(data, 'add');
        }
        applyFilters();
        updateStats();
    } catch (error) {
        showAlert('Gagal Sinkron', 'Data gagal dikirim ke server: ' + error.message, 'error');
    }
}

async function confirmDelete() {
    if (state.currentEditId) {
        hideToastInstantly();
        closeConfirmModal();
        try {
            await deleteData(state.currentEditId);
            applyFilters();
            updateStats();
        } catch (error) {
            showToast('Gagal menghapus di server', 'error');
        }
    }
}

// Global Confirmation Helper
let pendingConfirmCallback = null;

function initConfirmModal() {
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConfirmModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (pendingConfirmCallback) pendingConfirmCallback();
            closeConfirmModal();
        });
    }
}

function openConfirmModal({ title, desc, onConfirm }) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const descEl = document.getElementById('confirmDesc');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    pendingConfirmCallback = onConfirm;

    if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
}

function openDeleteModal(id) {
    state.currentEditId = id;
    openConfirmModal({
        title: 'Hapus Data?',
        desc: 'Item ini akan dihapus secara permanen dari daftar koleksi Anda.',
        onConfirm: confirmDelete
    });
}

function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const statusTerm = elements.statusFilter.value;
    const categoryTerm = elements.categoryFilter.value;

    state.filteredData = state.filmData.filter(film => {
        const title = film.title ? film.title.toLowerCase() : '';
        const cast = film.cast ? film.cast.toLowerCase() : '';
        const type = film.type ? film.type.toLowerCase() : '';
        const matchesSearch = title.includes(searchTerm) || cast.includes(searchTerm) || type.includes(searchTerm);
        const matchesStatus = statusTerm === 'Semua Status' || statusTerm === '' || film.status === statusTerm;
        const matchesCategory = categoryTerm === 'Semua Kategori' || categoryTerm === '' || film.type === categoryTerm;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    applySort();
    updateStats();
}

function renderTable() {
    elements.tableBody.innerHTML = '';
    if (state.filteredData.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    elements.emptyState.classList.add('hidden');
    state.filteredData.forEach(film => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID">#${film.id}</td>
            <td data-label="Judul"><strong>${escapeHtml(film.title)}</strong></td>
            <td data-label="Cast">${escapeHtml(film.cast || '-')}</td>
            <td data-label="Tipe"><span class="type-tag">${escapeHtml(film.type)}</span></td>
            <td data-label="Episode">${film.episodes || '-'}</td>
            <td data-label="Status"><span class="status-badge ${getStatusClass(film.status)}">${escapeHtml(film.status)}</span></td>
            <td data-label="Tanggal">${film.date ? formatDate(film.date) : '-'}</td>
            <td data-label="Link">
                ${film.link ? `<a href="${escapeHtml(film.link)}" target="_blank" class="link-btn" title="Buka Link"><i data-lucide="external-link"></i></a>` : '-'}
            </td>
            <td data-label="Aksi">
                <div class="action-buttons">
                    <button class="btn-edit" data-id="${film.id}"><i data-lucide="edit-2"></i></button>
                    <button class="btn-del" data-id="${film.id}"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        // Use event delegation or direct binding
        row.querySelector('.btn-edit').addEventListener('click', () => editFilm(film.id));
        row.querySelector('.btn-del').addEventListener('click', () => openDeleteModal(film.id));
        elements.tableBody.appendChild(row);
    });
    if (window.lucide) window.lucide.createIcons();
}

function updateStats() {
    elements.totalCount.textContent = state.filmData.length;
    elements.completedCount.textContent = state.filmData.filter(f => f.status === 'Selesai').length;
    elements.watchingCount.textContent = state.filmData.filter(f => f.status === 'Sedang Ditonton').length;
    elements.plannedCount.textContent = state.filmData.filter(f => f.status === 'Rencana').length;
}

function handleSort(column) {
    if (state.sortColumn === column) state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    else { state.sortColumn = column; state.sortDirection = 'asc'; }
    applySort();
}

function applySort() {
    const { sortColumn, sortDirection } = state;
    state.filteredData.sort((a, b) => {
        let aVal = a[sortColumn], bVal = b[sortColumn];
        if (aVal == null) return 1; if (bVal == null) return -1;
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        return aVal < bVal ? (sortDirection === 'asc' ? -1 : 1) : (sortDirection === 'asc' ? 1 : -1);
    });
    renderTable();
}

function editFilm(id) {
    const film = state.filmData.find(f => f.id == id);
    if (film) openEditModal(film);
}


// External Logic (Custom Selects & FAB Drag)
function initCustomSelects() {
    const selects = document.querySelectorAll('select.filter-input, select.form-input, select.mdl-select');
    selects.forEach(select => {
        if (select.closest('.custom-select-container')) return;

        const container = document.createElement('div');
        container.className = 'custom-select-container';
        if (select.id.includes('Filter')) container.classList.add('filter-select');

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';

        select.parentNode.insertBefore(container, select);
        container.appendChild(select);
        container.appendChild(trigger);
        container.appendChild(optionsContainer);

        select.style.display = 'none';

        const updateTrigger = () => {
            const selected = select.options[select.selectedIndex];
            trigger.textContent = selected ? selected.textContent : 'Pilih...';
        };

        const createOptions = () => {
            optionsContainer.innerHTML = '';
            Array.from(select.options).forEach((opt, idx) => {
                const o = document.createElement('div');
                o.className = 'custom-option';
                if (opt.disabled) o.classList.add('disabled');
                if (opt.selected) o.classList.add('selected');
                o.textContent = opt.textContent;
                o.onclick = () => {
                    select.selectedIndex = idx;
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    container.classList.remove('active');
                    updateTrigger();
                    createOptions();
                };
                optionsContainer.appendChild(o);
            });
        };

        trigger.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-container').forEach(c => {
                if (c !== container) c.classList.remove('active');
            });
            container.classList.toggle('active');
        };

        updateTrigger();
        createOptions();
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-container').forEach(c => c.classList.remove('active'));
    });
}

function updateCustomSelects() {
    document.querySelectorAll('.custom-select-container').forEach(container => {
        const select = container.querySelector('select');
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelector('.custom-options');

        if (select && trigger) {
            trigger.textContent = select.options[select.selectedIndex]?.textContent || 'Pilih...';
            if (options) {
                Array.from(options.children).forEach((opt, idx) => {
                    opt.classList.toggle('selected', idx === select.selectedIndex);
                });
            }
        }
    });
}

function initFabDrag(el) {
    let isDragging = false;
    let startX, startY, initialX, initialY, hasMoved = false;

    const setPosition = (leftPercent, topPercent) => {
        const winW = window.innerWidth, winH = window.innerHeight, rect = el.getBoundingClientRect();
        let left = (leftPercent / 100) * winW;
        let top = (topPercent / 100) * winH;

        // Clamp to screen
        left = Math.max(10, Math.min(left, winW - rect.width - 10));
        top = Math.max(10, Math.min(top, winH - rect.height - 10));

        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';

        // Return actual clamped percentages
        return {
            left: (left / winW) * 100,
            top: (top / winH) * 100
        };
    };

    const savedPos = JSON.parse(localStorage.getItem('fab_position_percent'));
    if (savedPos) {
        setPosition(savedPos.left, savedPos.top);
    }

    let ticking = false;

    const onStart = (e) => {
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
        el.style.zIndex = '9999';
    };

    const updatePosition = (clientX, clientY) => {
        if (!isDragging) {
            ticking = false;
            return;
        }
        const dx = clientX - startX, dy = clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;

        const winW = window.innerWidth, winH = window.innerHeight;
        const rect = el.getBoundingClientRect();

        let newX = initialX + dx;
        let newY = initialY + dy;

        // Constraint within viewport
        newX = Math.max(0, Math.min(newX, winW - rect.width));
        newY = Math.max(0, Math.min(newY, winH - rect.height));

        const actualDx = newX - initialX;
        const actualDy = newY - initialY;

        el.style.transform = `translate3d(${actualDx}px, ${actualDy}px, 0)`;
        ticking = false;
    };

    const onMove = (e) => {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        if (!ticking) {
            requestAnimationFrame(() => updatePosition(clientX, clientY));
            ticking = true;
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'grab';
        el.style.zIndex = '4000';

        const rect = el.getBoundingClientRect();
        const posPercent = {
            left: (rect.left / window.innerWidth) * 100,
            top: (rect.top / window.innerHeight) * 100
        };

        // Finalize position using styles instead of transform
        el.style.transition = 'none';
        el.style.transform = 'none';
        setPosition(posPercent.left, posPercent.top);

        // Restore transition for other effects
        setTimeout(() => el.style.transition = '', 50);

        if (hasMoved) {
            localStorage.setItem('fab_position_percent', JSON.stringify(posPercent));
        }
    };

    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    window.addEventListener('resize', debounce(() => {
        const currentPos = JSON.parse(localStorage.getItem('fab_position_percent'));
        if (currentPos) {
            setPosition(currentPos.left, currentPos.top);
        } else {
            // Default position if never dragged
            el.style.left = ''; el.style.top = '';
            el.style.right = '32px'; el.style.bottom = '32px';
            el.style.transform = '';
        }
    }, 100));

    el.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);
}

function setupStatFilters() {
    const statusFilter = elements.statusFilter;
    if (!statusFilter) return;

    const filterMaps = [
        { id: 'stat-total', value: 'Semua Status' },
        { id: 'stat-completed', value: 'Selesai' },
        { id: 'stat-watching', value: 'Sedang Ditonton' },
        { id: 'stat-planned', value: 'Rencana' }
    ];

    filterMaps.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            const card = element.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    statusFilter.value = item.value;
                    updateCustomSelects();
                    applyFilters();
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => card.style.transform = '', 100);
                });
            }
        }
    });
}

