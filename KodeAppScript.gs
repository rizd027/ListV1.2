// Konfigurasi Spreadsheet
const SPREADSHEET_ID = '1UD6B6T8__e4SrnWAor_dMTtJQGed3xcuc_WGaCiQtoY';
const DATA_HEADERS = ['no', 'judul', 'cast', 'type', 'episode', 'status', 'date', 'notes', 'link'];
const AUTH_SHEET_NAME = 'user';
/**
 * Mendapatkan atau membuat sheet untuk autentikasi user
 */
function getAuthSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(AUTH_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AUTH_SHEET_NAME);
    sheet.appendRow(['username', 'password']); 
  }
  return sheet;
}
/**
 * Mendapatkan atau membuat sheet data khusus per user
 */
function getOrDataSheet(userName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(userName);
  if (!sheet) {
    sheet = ss.insertSheet(userName);
    sheet.appendRow(DATA_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
/**
 * Menangani permintaan POST (Login, Register, Add, Edit, Delete)
 */
function doPost(e) {
  const action = e.parameter.action;
  const user = e.parameter.user;
  const pass = e.parameter.pass;
  
  const authSheet = getAuthSheet();
  const userData = authSheet.getDataRange().getValues();
  const userFound = userData.find(row => row[0] === user);
  // --- LOGIKA PENDAFTARAN (REGISTER) ---
  if (action === 'register') {
    if (!user || !pass) return responseError('Username dan Password tidak boleh kosong!');
    if (userFound) return responseError('Username sudah terdaftar!');
    
    authSheet.appendRow([user.toString(), pass.toString()]);
    getOrDataSheet(user); 
    return responseSuccess({ message: 'Akun berhasil didaftarkan untuk ' + user });
  }
  // --- LOGIKA LOGIN ---
  if (action === 'login') {
    if (userFound && userFound[1].toString() === pass.toString()) {
      return responseSuccess({ message: 'Login Berhasil' });
    }
    return responseError(userFound ? 'Password salah!' : 'Username tidak ditemukan.');
  }
  // --- OPERASI DATA (Add, Edit, Delete) ---
  const dataSheet = getOrDataSheet(user);
  let body;
  try {
    body = e.parameter.data ? JSON.parse(e.parameter.data) : null;
  } catch (err) {
    return responseError('Format data JSON tidak valid');
  }
  // 1. AKSI TAMBAH (ADD)
  if (action === 'add') {
    const lastRow = dataSheet.getLastRow();
    const newId = lastRow; 
    dataSheet.appendRow([newId, body.judul, body.cast, body.type, body.episode, body.status, body.date, body.notes, body.link]);
    return responseSuccess('Data berhasil ditambahkan');
  }
  // 2. AKSI EDIT
  if (action === 'edit') {
    if (!body.rowIndex) return responseError('RowIndex diperlukan untuk edit');
    const oldId = dataSheet.getRange(body.rowIndex, 1).getValue();
    dataSheet.getRange(body.rowIndex, 1, 1, DATA_HEADERS.length)
             .setValues([[oldId, body.judul, body.cast, body.type, body.episode, body.status, body.date, body.notes, body.link]]);
    return responseSuccess('Data berhasil diperbarui');
  }
  // 3. AKSI HAPUS (DELETE) - DENGAN PENOMORAN ULANG
  if (action === 'delete') {
    if (!body.rowIndex) return responseError('RowIndex diperlukan untuk hapus');
    
    dataSheet.deleteRow(body.rowIndex);
    
    const lastRow = dataSheet.getLastRow();
    if (lastRow > 1) {
      const numRows = lastRow - 1;
      const newNumbers = [];
      for (let i = 1; i <= numRows; i++) {
        newNumbers.push([i]);
      }
      dataSheet.getRange(2, 1, numRows, 1).setValues(newNumbers);
    }
    
    return responseSuccess('Data berhasil dihapus dan nomor urut diperbarui');
  }
}
/**
 * Menangani permintaan GET (Read Data)
 */
function doGet(e) {
  const action = e.parameter.action;
  const user = e.parameter.user;
  
  if (action === 'read') {
    if (!user) return responseError('Username diperlukan untuk membaca data');
    
    const sheet = getOrDataSheet(user);
    const rows = sheet.getDataRange().getValues();
    const data = [];
    
    for (let i = 1; i < rows.length; i++) {
      let obj = { rowIndex: i + 1 };
      DATA_HEADERS.forEach((h, index) => obj[h] = rows[i][index]);
      data.push(obj);
    }
    return responseSuccess(data);
  }
  
  return responseError('Aksi tidak dikenal');
}
function responseSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
                       .setMimeType(ContentService.MimeType.JSON);
}
function responseError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg }))
                       .setMimeType(ContentService.MimeType.JSON);
}