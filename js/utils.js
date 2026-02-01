export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

export function getStatusClass(status) {
    const map = {
        'Selesai': 'status-selesai',
        'Sedang Ditonton': 'status-sedang-ditonton',
        'Rencana': 'status-rencana',
        'Ditunda': 'status-ditunda',
        'Drop': 'status-drop'
    };
    return map[status] || '';
}

/**
 * Helper to dynamic load HTML components
 */
export async function loadComponent(id, url) {
    const container = document.getElementById(id);
    if (!container) return;
    try {
        const response = await fetch(url);
        const html = await response.text();
        container.innerHTML = html;
        // Trigger lucide icons if any
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error(`Failed to load component: ${url}`, error);
    }
}
