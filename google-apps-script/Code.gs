/**
 * Google Apps Script backend untuk form PO Kosmik Bogor.
 * Pasang sebagai script yang terikat ke Google Sheet.
 */
const SHEET_NAME = 'Pesanan';
const HEADERS = [
  'no_po', 'tanggal', 'nama', 'wa', 'ukuran', 'jumlah',
  'pesanan', 'total', 'alamat', 'status_bayar', 'resi'
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    if (params.action === 'simpan') {
      const result = saveOrder_(params);
      return respond_(result, params.callback);
    }

    if (params.action === 'list') {
      const filters = {
        no_po: normalize_(params.no_po),
        nama: normalize_(params.nama),
        wa: normalize_(params.wa)
      };
      const filled = Object.values(filters).filter(value => value.length >= 2).length;
      if (filled < 2) {
        return respond_({ ok: false, error: 'Isi minimal dua kolom pencarian.' }, params.callback);
      }

      const sheet = getSheet_();
      const rows = sheet.getDataRange().getDisplayValues();
      const header = rows.shift() || [];
      const index = Object.fromEntries(header.map((value, i) => [value, i]));
      const matches = rows
        .filter(row => matches_(row, index, filters))
        .slice(-100)
        .reverse()
        .map(row => Object.fromEntries(HEADERS.map(key => [key, row[index[key]] || ''])));
      return respond_({ ok: true, data: matches }, params.callback);
    }

    return respond_({ ok: true, message: 'PO Kosmik Bogor API siap.' }, params.callback);
  } catch (error) {
    console.error(error);
    return respond_({ ok: false, error: error.message || 'Terjadi kesalahan server.' }, params.callback);
  }
}

// Tetap mendukung request POST jika kelak diperlukan.
function doPost(e) {
  try {
    return json_(saveOrder_((e && e.parameter) || {}));
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: error.message || 'Terjadi kesalahan server.' });
  }
}

function saveOrder_(params) {
  if (params.action !== 'simpan') {
    return { ok: false, error: 'Aksi tidak dikenali.' };
  }

  const required = ['no_po', 'nama', 'wa', 'ukuran', 'jumlah', 'alamat'];
  const missing = required.filter(key => !String(params[key] || '').trim());
  if (missing.length) {
    return { ok: false, error: 'Data wajib belum lengkap: ' + missing.join(', ') };
  }

  const quantity = parseInt(params.jumlah, 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: 'Jumlah pesanan tidak valid.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const values = [
      safeCell_(params.no_po),
      safeCell_(params.tanggal || new Date().toLocaleDateString('id-ID')),
      safeCell_(params.nama),
      safeCell_(params.wa),
      safeCell_(params.ukuran),
      quantity,
      safeCell_(params.pesanan || `Kaos Kosmik Size ${params.ukuran} (${quantity}x)`),
      safeCell_(params.total || ''),
      safeCell_(params.alamat),
      'BELUM LUNAS',
      ''
    ];
    sheet.appendRow(values);
    SpreadsheetApp.flush();
    return { ok: true, no_po: String(params.no_po) };
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Spreadsheet tidak ditemukan. Buat Apps Script dari Google Sheet melalui Extensions > Apps Script.');
  }
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function matches_(row, index, filters) {
  return Object.entries(filters).every(([key, query]) => {
    if (!query) return true;
    if (index[key] === undefined) return false;
    const value = String(row[index[key]] || '').replace(/^'/, '').toLowerCase();
    return value.includes(query);
  });
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

// Cegah nilai dari pengguna dieksekusi sebagai formula di Google Sheets.
function safeCell_(value) {
  const text = String(value == null ? '' : value).trim();
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// JSONP dipakai agar halaman GitHub Pages dapat membaca hasil lintas domain.
function respond_(data, callback) {
  if (callback) {
    if (!/^[A-Za-z_$][\w$]{0,99}$/.test(callback)) {
      return json_({ ok: false, error: 'Callback tidak valid.' });
    }
    const safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
    return ContentService.createTextOutput(`${callback}(${safeJson});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(data);
}
