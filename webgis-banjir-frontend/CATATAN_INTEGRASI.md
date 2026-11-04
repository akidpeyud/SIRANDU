# Catatan integrasi frontend SIRANDU ↔ backend

Frontend ini = tampilan terbaru (hero foto, simulasi banjir, footer, foto tim) + sambungan ke backend `webgis-banjir-backend`.

## Menjalankan
```bash
# terminal 1 (backend, port 3000)
cd webgis-banjir-backend && npm install && npm start
# terminal 2 (frontend, port 5173; /api diteruskan ke :3000)
cd webgis-banjir-frontend && npm install && npm run dev
```
File halaman bawaan backend yang ditambal ada di `backend-patch/public/` (timpa file di `webgis-banjir-backend/public/`).

## Enam poin rekomendasi: status
| # | Poin | Hasil |
|---|------|-------|
| 1 | GPS 1-klik | Tombol "Gunakan lokasi saya saat ini" di panel peta React (`components/map/WebgisMap.jsx`, hook `hooks/useGeolocation.js`) dan di halaman lama `public/index.html` (lewat `sirandu-ui.js`). Pesan error terpisah untuk izin ditolak / GPS mati / timeout. |
| 2 | React-Leaflet native | `WebgisModal` kini memuat `WebgisMap` (react-leaflet 4, di-lazy-load: Leaflet hanya diunduh saat peta dibuka). 8 layer, filter kecamatan, klik peta untuk memilih titik, Cek Risiko, rute evakuasi (garis beranimasi), popup posko dengan tombol "Rute ke posko ini". Tanpa iframe. |
| 3 | alert() → toast | React: `context/ToastContext.jsx` (`useToast()`). Halaman backend (`admin.html`, `index.html`): `sirandu-ui.js` menimpa `window.alert` jadi toast, tanpa mengubah 20+ pemanggilan yang ada. `confirm()` untuk hapus data sengaja dibiarkan sebagai pengaman. |
| 4 | Grafik 24 jam | `components/RainChart.jsx` (SVG murni, tanpa Chart.js agar ringan) di bagian Klasifikasi: 11 kecamatan bisa dipilih, data dari `GET /api/cuaca/:id`. Tombol "Coba di simulasi" memindahkan total 24 jam ke slider kelas BMKG. |
| 5 | Tabel admin mobile | `sirandu-ui.css/js`: di <640px semua tabel admin jadi kartu; kolom 1, 2 dan Aksi tampil, sisanya di balik tombol "Detail". Berlaku juga untuk baris yang dirender ulang oleh JS. |
| 6 | Data tim | `src/data/content.js`: nama, peran dan foto sudah asli (Aria, Asril, Dika). **Isi `nim` dan `kampus` tiap anggota**; kosong = tidak ditampilkan. File lama `src/data.js` tidak ikut (tidak dipakai). |

## Temuan di kode backend/frontend lama (perlu diputuskan tim)
1. **Dua endpoint salah nama** di `services/api.js` lama: `/cuaca/sync-sekarang` (tidak ada; yang ada `/cuaca/sync-manual`) dan parameter `id_posko` (backend membaca `posko_id`). Sudah diperbaiki di versi ini.
2. **`POST /api/cuaca/sync-manual` terbuka untuk publik.** Siapa pun bisa memicu penarikan Open-Meteo berulang-ulang. Tombol "Sync Cuaca Sekarang" saya cabut dari landing page; sebaiknya endpoint dipindah ke `/api/admin/...` dengan JWT atau diberi rate limit.
3. **Dua skala klasifikasi berbeda.** Backend menilai status per **jam** (Waspada >5, Siaga >10 mm/jam, `weatherScheduler.js`), sedangkan simulasi di landing page memakai kelas harian BMKG (mm/hari: 5/20/50/100/150). Grafik 24 jam diberi label mm/jam dengan garis ambang backend, dan total 24 jam dikonversi ke mm/hari untuk simulasi. Tetap perlu satu kalimat penjelasan di proposal/demo agar penguji tidak bingung.
4. **Geolocation butuh HTTPS** (atau localhost). Demo lewat `http://192.168.x.x` dari HP tidak akan bisa memakai GPS; deploy dengan HTTPS.
5. **Tile OpenStreetMap** dipakai langsung. Untuk trafik tinggi, ikuti kebijakan penggunaan OSM atau ganti penyedia tile.
6. File lama tak terpakai di frontend (tidak diimpor `main.jsx`): `data.js`, `sections.jsx`, `previews.jsx`, `ui.jsx`, `store.js`, `styles.css`, `WaterCanvas.jsx`, `images.js`, `assets/f/`. Tidak dibawa ke versi ini; aman dihapus dari repo.

## Yang belum teruji
Pengujian saya memakai server API tiruan dengan **bentuk respons yang sama** dengan controller backend (dibaca dari kode), bukan PostgreSQL/PostGIS/pgRouting sungguhan. Alur login admin dan CRUD admin belum dijalankan end-to-end. Sebelum demo, jalankan sekali dengan backend asli.
