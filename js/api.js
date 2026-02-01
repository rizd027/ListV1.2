import { elements, state } from './state.js';
import { CONFIG } from './config.js';
import { showLoading, hideLoading, showToast } from './ui.js';

export async function loadData() {
    if (!state.currentUser || !state.currentPass) return;
    showLoading('Loading Data...');
    try {
        const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(state.currentUser)}&pass=${encodeURIComponent(state.currentPass)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.status === 'success') {
            state.filmData = result.data.map(item => ({
                id: parseInt(item.no),
                title: item.judul || '',
                cast: item.cast || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                link: item.link || '',
                rowIndex: item.rowIndex
            }));
            state.filteredData = [...state.filmData];
            return state.filmData;
        } else {
            throw new Error(result.message || 'Gagal memuat data');
        }
    } catch (error) {
        showToast('Gagal memuat data: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

export async function saveData(data, action = 'add') {
    if (!state.currentUser || !state.currentPass) return;
    const oldFilmData = [...state.filmData];

    if (action === 'add') {
        data.id = state.filmData.length > 0 ? Math.max(...state.filmData.map(f => f.id)) + 1 : 1;
        state.filmData.push(data);
    } else {
        const index = state.filmData.findIndex(f => f.id == data.id);
        if (index !== -1) {
            data.rowIndex = state.filmData[index].rowIndex;
            state.filmData[index] = data;
        }
    }

    showToast(action === 'add' ? 'Menambah data...' : 'Memperbarui data...', 'info');

    try {
        const sheetData = {
            no: data.id,
            judul: data.title,
            cast: data.cast,
            type: data.type,
            episode: data.episodes,
            status: data.status,
            date: data.date,
            notes: data.notes,
            link: data.link,
            rowIndex: data.rowIndex
        };
        const formData = new FormData();
        formData.append('data', JSON.stringify(sheetData));
        const url = `${CONFIG.SHEET_API_URL}?action=${action}&user=${encodeURIComponent(state.currentUser)}&pass=${encodeURIComponent(state.currentPass)}`;
        const response = await fetch(url, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            showToast('Sinkronisasi Berhasil!', 'success');
            await silentLoadData();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        state.filmData = oldFilmData;
        throw error;
    }
}

export async function deleteData(id) {
    if (!state.currentUser || !state.currentPass) return;
    const targetFilm = state.filmData.find(f => f.id == id);
    if (!targetFilm) return;

    state.filmData = state.filmData.filter(f => f.id != id);
    state.filmData.forEach((film, index) => {
        film.id = index + 1;
        film.rowIndex = index + 2;
    });

    showToast('Menghapus data...', 'info');

    try {
        const formData = new FormData();
        formData.append('data', JSON.stringify({ rowIndex: targetFilm.rowIndex }));
        const url = `${CONFIG.SHEET_API_URL}?action=delete&user=${encodeURIComponent(state.currentUser)}&pass=${encodeURIComponent(state.currentPass)}`;
        const response = await fetch(url, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        showToast('Terhapus dari database', 'success');
    } catch (error) {
        throw error;
    }
}

async function silentLoadData() {
    try {
        const url = `${CONFIG.SHEET_API_URL}?action=read&user=${encodeURIComponent(state.currentUser)}&pass=${encodeURIComponent(state.currentPass)}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.status === 'success') {
            state.filmData = result.data.map(item => ({
                id: parseInt(item.no),
                title: item.judul || '',
                cast: item.cast || '',
                type: item.type || '',
                episodes: item.episode || null,
                status: item.status || '',
                date: item.date || null,
                notes: item.notes || '',
                link: item.link || '',
                rowIndex: item.rowIndex
            }));
        }
    } catch (e) {
        console.log("Silent update failed");
    }
}
