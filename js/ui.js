import { elements, state } from './state.js';

export function showAlert(title, message, type = 'info') {
    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;
    const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');
    elements.alertIcon.setAttribute('data-lucide', iconName);
    elements.customAlert.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function showToast(message, type = 'success') {
    if (state.toastTimeout) clearTimeout(state.toastTimeout);
    const toast = elements.toast;
    toast.classList.remove('active');
    void toast.offsetWidth;
    elements.toastMessage.textContent = message;
    toast.className = `toast active ${type}`;
    const iconName = type === 'success' ? 'check-circle' : (type === 'info' ? 'info' : 'alert-circle');
    elements.toastIcon.setAttribute('data-lucide', iconName);
    if (window.lucide) window.lucide.createIcons();
    state.toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

export function hideToastInstantly() {
    if (state.toastTimeout) clearTimeout(state.toastTimeout);
    elements.toast.classList.remove('active');
}

export function showLoading(message = 'Memuat...') {
    const loadingText = elements.loadingOverlay.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = message;
    elements.loadingOverlay.classList.remove('hidden');
}

export function hideLoading() {
    setTimeout(() => {
        elements.loadingOverlay.classList.add('hidden');
    }, 200);
}
