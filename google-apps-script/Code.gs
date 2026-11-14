/**
 * Google Apps Script backend untuk form PO Kosmik Bogor.
 * Gunakan script ini sebagai project yang terikat (bound) ke Google Sheet.
 */
const SHEET_NAME = 'Pesanan';
const HEADERS = [
  'no_po', 'tanggal', 'nama', 'wa', 'ukuran', 'jumlah',
  'pesanan', 'total', 'alamat', 'status_bayar', 'resi'
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === 'list') {
    const filters = {
      no_po: normalize_(params.no_po),
      nama: normalize_(params.nama),
      wa: normalize_(params.wa)
    };
    const validFilters = Object.values(filters).filter(value => value.length >= 2).length;
    if (validFilters < 2) {
      return respond_({ ok: false, error: 'Isi minimal dua kolom pencarian.' }, params.callback);
    }

    const rows = getSheet_().getDataRange().getDisplayValues();
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
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  if (params.action !== 'simpan') {
    return json_({ ok: false, error: 'Aksi tidak dikenali.' });
  }

  const required = ['no_po', 'nama', 'wa', 'ukuran', 'jumlah', 'alamat'];
  const missing = required.filter(key => !String(params[key] || '').trim());
  if (missing.length) {
    return json_({ ok: false, error: 'Data wajib belum lengkap: ' + missing.join(', ') });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const noPO = safeCell_(params.no_po);
    const values = [
      noPO,
      safeCell_(params.tanggal || new Date().toLocaleDateString('id-ID')),
      safeCell_(params.nama),
      safeCell_(params.wa),
      safeCell_(params.ukuran),
      Math.max(1, parseInt(params.jumlah, 10) || 1),
      safeCell_(params.pesanan || `Kaos Kosmik Size ${params.ukuran}`),
      safeCell_(params.total || ''),
      safeCell_(params.alamat),
      'BELUM LUNAS',
      ''
    ];
    sheet.appendRow(values);
    return json_({ ok: true, no_po: noPO });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Buat Apps Script dari dalam Google Sheet (Extensions > Apps Script).');
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
    const value = String(row[index[key]] || '').replace(/^'/, '').toLowerCase();
    return value.includes(query);
  });
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

// Hindari input pesanan dianggap formula oleh Google Sheets.
function safeCell_(value) {
  const text = String(value == null ? '' : value).trim();
  return /^[=+@]/.test(text) || /^-/.test(text) ? "'" + text : text;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hasil JSONP untuk pembacaan lintas domain dari GitHub Pages.
function respond_(data, callback) {
  if (callback) {
    if (!/^[A-Za-z_$][\w$]{0, hundert}$/.test(callback)) {
      // Validation below uses a strict callback pattern; reject malformed names.
      return json_({ ok: false, error: 'Callback tidak valid.' });
    }
    const script = `${callback}(${JSON.stringify(data).replace(/</g, '\\u003c')});`;
    return ContentService.createTextOutput(script)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(data);
}
