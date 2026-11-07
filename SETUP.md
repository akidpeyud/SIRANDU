# SIRANDU – Menjalankan frontend + backend

Prasyarat: Node 18+, PostgreSQL 14+ dengan PostGIS dan pgRouting.

## 1. Backend
```
cd webgis-banjir-backend
cp .env.example .env        # isi DB_PASSWORD dan JWT_SECRET
createdb -U postgres db_banjir
npm install
npm run db:setup            # migrasi + seed + poligon kecamatan + akun admin
npm start                   # http://localhost:3000
```
## 2. Frontend
```
cd webgis-banjir-frontend
npm install
npm run dev                 # http://localhost:5173  (proxy /api -> localhost:3000)
```
Backend di alamat lain: buat `.env` frontend berisi `VITE_BACKEND_URL=http://alamat:port`.

## 3. Data banjir
Repo `sig_muarabulian` TIDAK berisi data banjir (hanya ekstrak OSM Muara Bulian, ±38 km dari Kota Jambi),
jadi tidak diimpor. Data seed bawaan hanyalah contoh. Untuk data nyata (BPBD Kota Jambi, InaRISK, survei):
```
# isi database/templates/titik_banjir_template.csv (atau GeoJSON Point dengan properti sama)
npm run db:import-banjir -- data.csv --dry   # cek dulu
npm run db:import-banjir -- data.csv
```
Aman dijalankan ulang (duplikat nama+tanggal dilewati). Kecamatan terisi otomatis dari lokasi titik.

## 4. Sebelum dipublikasikan (penting)
- Ganti password admin (default `admin / admin123`) dan set `JWT_SECRET` kuat.
- Rute tulis publik belum dilindungi token: POST/PUT/DELETE `/api/posko`, `/api/air-bersih`, POST `/api/wilayah`, `/api/cuaca/sync-manual`, `/api/pemantauan/input`. Tambahkan `verifyToken` sebelum online.
- Tabel `elevasi` kosong; sinkron cuaca Open-Meteo belum terverifikasi di luar sandbox.
