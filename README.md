# Maya Photobooth — Universitas Mayasari Bakti

Website photobooth interaktif dengan **25 desain frame Canva** (*Different Pieces*) resolusi cetak **4R HD (`1200 × 1800 px`, 300 DPI)**, dilengkapi form biodata pengunjung, simpan otomatis ke Excel/CSV, dan Panel Panitia.

## Fitur Utama
- **25 Frame Canva Transparan HD:** Semua logo, maskot, dan ornamen desain otomatis tampil di depan foto.
- **Sesi Foto Kamera & Upload:** Live webcam / kamera HP (depan & belakang), *mirror*, garis bantu crop, timer (`Manual / 3 / 5 / 10 dtk`), efek flash & suara shutter, 7 filter warna, *auto-shoot*, *retake* per slot, dan upload foto dari galeri.
- **Export & Cetak 4R:** Download PNG HD 4R, JPG, Download 1 Strip (Kiri/Kanan) siap IG Story/WA, dan cetak langsung ukuran 4×6 inci (`@page`).
- **Form Biodata & Nama File Otomatis:** Nama file download otomatis mengikuti nama peserta, dan data biodata tersimpan otomatis ke `data/biodata.csv` (siap dibuka di Microsoft Excel).
- **Panel Panitia:** Dilindungi PIN (default `1234`), menampilkan statistik, tabel pencarian, export CSV, dan pengaturan posisi form biodata (Sesudah Foto / Sebelum Foto / Nonaktif).

## Cara Menjalankan
1. Pastikan **Node.js** sudah terpasang (`node -v`).
2. Jalankan salah satu:
   - Klik dua kali `start.bat` (Windows), atau
   - Jalankan di terminal:
     ```bash
     node server.js
     ```
3. Buka `http://localhost:3000` di browser.

> Untuk mengubah PIN Panitia atau port server, atur environment variable `ADMIN_PIN` atau `PORT`, misalnya:
> ```bash
> set ADMIN_PIN=5678 && node server.js
> ```
