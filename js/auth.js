import { elements, state } from './state.js';
import { CONFIG } from './config.js';
import { showLoading, hideLoading, showToast } from './ui.js';
import { loadData } from './api.js';

export async function handleLogin() {
    const user = elements.usernameInput.value.trim().toLowerCase();
    const pass = elements.passwordInput.value.trim();
    if (!user || !pass) {
        showToast('Username dan Password wajib diisi!', 'error');
        return;
    }
    const cleanUser = user.replace(/[^a-z0-9]/g, '_');
    showLoading(state.authMode === 'login' ? 'Logging In...' : 'Registering...');
    try {
        const url = `${CONFIG.SHEET_API_URL}?action=${state.authMode}&user=${encodeURIComponent(cleanUser)}&pass=${encodeURIComponent(pass)}`;
        const response = await fetch(url, { method: 'POST' });
        const result = await response.json();
        if (result.status === 'success') {
            if (state.authMode === 'register') {
                showToast('Pendaftaran berhasil! Silakan login.', 'success');
                switchAuthMode('login');
                elements.passwordInput.value = '';
            } else {
                showToast('Berhasil Masuk!', 'success');
                localStorage.setItem('film_username', cleanUser);
                localStorage.setItem('film_password', pass);
                state.currentUser = cleanUser;
                state.currentPass = pass;
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
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

export function handleLogout() {
    localStorage.removeItem('film_username');
    localStorage.removeItem('film_password');
    window.location.href = 'index.html';
}

export function switchAuthMode(mode) {
    state.authMode = mode;
    const isLogin = mode === 'login';
    const tabLogin = elements.tabLogin;
    const tabRegister = elements.tabRegister;
    const authFooter = elements.authFooter;

    if (tabLogin) tabLogin.classList.toggle('active', isLogin);
    if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
    if (authFooter) authFooter.classList.toggle('active', !isLogin);

    elements.loginBtn.textContent = isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang';
    elements.authSubtitle.textContent = isLogin ? 'Silakan masuk ke akun Anda' : 'Daftar untuk mulai mengelola';
    if (window.lucide) window.lucide.createIcons();
}


export function togglePasswordVisibility(inputId, button) {
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
        if (window.lucide) window.lucide.createIcons();
    }
}
