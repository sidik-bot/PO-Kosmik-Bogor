# Menghubungkan form ke Google Sheets

Form menyimpan pesanan ke Google Sheets melalui Google Apps Script, lalu membuka WhatsApp admin. Data tersimpan pada tab **Pesanan** dengan kolom `no_po`, `tanggal`, `nama`, `wa`, `ukuran`, `jumlah`, `pesanan`, `total`, `alamat`, `status_bayar`, dan `resi`.

## Setup awal

1. Buat atau buka Google Spreadsheet yang akan dipakai untuk pesanan.
2. Di spreadsheet, pilih **Extensions → Apps Script**.
3. Ganti isi `Code.gs` di editor Apps Script dengan isi file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) dari repositori ini, lalu simpan.
4. Di Apps Script, pilih **Deploy → New deployment**.
5. Pilih tipe **Web app**, atur **Execute as: Me**, lalu atur akses sesuai kebutuhan situs. Untuk form publik yang dibuka dari GitHub Pages, pilih akses publik yang tersedia di akun Anda (biasanya **Anyone**).
6. Deploy dan izinkan akses Apps Script ke spreadsheet. Salin URL Web App yang berakhiran `/exec`.
7. Di `index.html`, ganti nilai `URL_APPS_SCRIPT` dengan URL deployment tersebut. Pastikan `NOMOR_ADMIN` dan harga `HARGA_PER_SIZE` sudah benar.
8. Jika Anda mengubah backend setelah deploy, buka **Deploy → Manage deployments → Edit → New version → Deploy**. URL deployment biasanya tetap sama.

Apps Script akan membuat tab **Pesanan** beserta judul kolom secara otomatis pada saat request pertama. Status pembayaran awal adalah `BELUM LUNAS`; kolom `status_bayar` dan `resi` dapat diperbarui admin langsung di spreadsheet.

## Penting

- Jangan membagikan link Google Sheet dengan izin edit ke publik. Pengunjung hanya mengirim pesanan lewat Apps Script.
- Situs yang dipublikasikan di GitHub Pages memakai nilai URL Apps Script di `index.html`; pastikan deployment-nya benar dan sudah memiliki izin yang sesuai.
- Form mengirim data ke Apps Script menggunakan request POST sederhana. Pencarian status menggunakan JSONP dan hanya dijalankan setelah minimal dua kolom pencarian diisi.
- Pengiriman order dan WhatsApp memerlukan koneksi internet. Tes satu pesanan setelah deployment dan pastikan barisnya muncul di tab **Pesanan**.
