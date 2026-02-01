export const state = {
    filmData: [],
    filteredData: [],
    currentEditId: null,
    sortColumn: 'id',
    sortDirection: 'asc',
    currentUser: localStorage.getItem('film_username') || null,
    currentPass: localStorage.getItem('film_password') || null,
    authMode: 'login',
    toastTimeout: null,
    selectedBulkIds: new Set()
};

export const elements = new Proxy({}, {
    get: function (target, prop) {
        // 1. Try exact ID
        let el = document.getElementById(prop);
        if (el) return el;

        // 2. Try kebap-case class (e.g. authFooter -> .auth-footer)
        const kebap = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
        el = document.querySelector(`.${kebap}`);
        if (el) return el;

        // 3. Try exact class name as fallback
        return document.querySelector(`.${prop}`);
    }
});


