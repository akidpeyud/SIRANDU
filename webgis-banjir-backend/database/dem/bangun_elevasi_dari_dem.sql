-- =========================================================
-- PENGOLAHAN DEM -> LAYER KETINGGIAN TANAH (hanya bila datanya mau dibuat ulang)
-- =========================================================
-- TIDAK dijalankan oleh `npm run db:setup`. Anggota tim biasa tidak perlu memakai berkas ini,
-- karena hasilnya sudah ada di database/seeds/08_seed_klasifikasi_elevasi.sql.
--
-- Langkah (butuh PostGIS dengan postgis_raster dan raster2pgsql, ikut terpasang bersama PostGIS):
--   1. Unduh DEM Copernicus GLO-30 untuk Kota Jambi (satu lembar, +-52 MB, tanpa akun):
--      https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S02_00_E103_00_DEM/Copernicus_DSM_COG_10_S02_00_E103_00_DEM.tif
--      (atau DEMNAS BIG 8 m, lebih teliti, butuh akun di tanahair.indonesia.go.id)
--   2. Aktifkan ekstensi dan muat raster ke tabel sementara dem_cop30_tmp:
--        psql -U postgres -d db_banjir -c "CREATE EXTENSION IF NOT EXISTS postgis_raster;"
--        raster2pgsql -s 4326 -t 128x128 -I -C -M Copernicus_DSM_COG_10_S02_00_E103_00_DEM.tif public.dem_cop30_tmp > dem.sql
--        psql -U postgres -d db_banjir -f dem.sql
--   3. Jalankan berkas ini:   psql -U postgres -d db_banjir -f database/dem/bangun_elevasi_dari_dem.sql
--   4. Ekspor ulang seed dan berkas JS:   npm run db:export-elevasi
--   5. (opsional) bersihkan:  DROP TABLE dem_cop30_tmp, dem_city, dem_city_smooth;
--
-- Catatan: kelas dibagi di 12 dan 25 mdpl (sama dengan perhitungan risiko di backend).
-- Atribusi: Copernicus DEM GLO-30 (ESA / Uni Eropa); periksa ketentuan resminya sebelum publikasi.
-- =========================================================
BEGIN;
DROP TABLE IF EXISTS dem_city, dem_city_smooth;

-- 1. Satu raster mosaik di sekitar kota (ubin digabung, margin 0.003 derajat)
CREATE TABLE dem_city AS
SELECT ST_Union(ST_Clip(d.rast, 1, b.g, -9999, true)) AS rast
FROM dem_cop30_tmp d,
     (SELECT ST_SetSRID(ST_Expand(ST_Extent(geom)::geometry, 0.003), 4326) AS g FROM wilayah_administrasi) b
WHERE ST_Intersects(d.rast, b.g);

-- 2. Haluskan rata-rata 5x5 piksel (+-150 m) agar tidak berbintik karena pohon/bangunan
CREATE TABLE dem_city_smooth AS
SELECT ST_MapAlgebra(rast, 1, 'ST_Mean4ma(float[][][],integer[][],text[])'::regprocedure,
                     '32BF', 'FIRST', NULL, 2, 2) AS rast
FROM dem_city;

-- 3. Bagi 3 kelas (batas 12 dan 25 mdpl, sama dengan kode risiko) lalu jadikan poligon
CREATE TEMP TABLE kelas_poly AS
WITH cls AS (
  SELECT ST_Reclass(rast, 1, '[-100-12):1, [12-25):2, [25-1000]:3', '8BUI', 0) AS r FROM dem_city_smooth
), dumped AS (
  SELECT (ST_DumpAsPolygons(r, 1, true)).* FROM cls
)
SELECT val::int AS kelas, ST_Union(geom) AS geom FROM dumped GROUP BY val;

-- 4. Potong per kecamatan (geometri batas diperbaiki), buang serpihan < 5.000 m2, sederhanakan ~16 m
CREATE TEMP TABLE hasil AS
WITH w AS (
  SELECT id, nama_kecamatan, ST_CollectionExtract(ST_MakeValid(geom), 3) AS geom FROM wilayah_administrasi
), pot AS (
  SELECT w.id AS wid, w.nama_kecamatan, k.kelas,
         (ST_Dump(ST_Intersection(k.geom, w.geom))).geom AS geom
  FROM kelas_poly k JOIN w ON ST_Intersects(k.geom, w.geom)
), bersih AS (
  SELECT wid, nama_kecamatan, kelas, geom FROM pot
  WHERE ST_GeometryType(geom) = 'ST_Polygon' AND ST_Area(geom::geography) >= 5000
)
SELECT wid, nama_kecamatan, kelas,
       ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(ST_Collect(geom), 0.00015)), 3)) AS geom
FROM bersih GROUP BY wid, nama_kecamatan, kelas;

-- 5. Isi tabel aplikasi (statistik mdpl dihitung dari DEM asli, bukan yang dihaluskan)
DELETE FROM klasifikasi_elevasi;
INSERT INTO klasifikasi_elevasi
  (wilayah_id, nama_wilayah, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl, warna_hex,
   deskripsi_topografi, rekomendasi_tata_ruang, sumber_data, geom)
SELECT h.wid,
       'Kec. ' || h.nama_kecamatan || ' - Dataran ' || (ARRAY['Rendah','Sedang','Tinggi'])[h.kelas],
       h.nama_kecamatan,
       (ARRAY['Rendah','Sedang','Tinggi'])[h.kelas],
       round(s.min::numeric,1) || ' - ' || round(s.max::numeric,1) || ' mdpl',
       round(s.mean::numeric,1),
       (ARRAY['#0ea5e9','#14b8a6','#84cc16'])[h.kelas],
       (ARRAY['Dataran rendah (di bawah 12 mdpl): cekungan yang rentan genangan dan luapan Sungai Batanghari maupun danau.',
              'Dataran sedang (12 - 25 mdpl): kawasan permukiman dengan genangan setempat saat hujan lebat.',
              'Dataran lebih tinggi (di atas 25 mdpl): relatif aman dari luapan sungai, tetapi tetap perlu drainase yang baik.'])[h.kelas],
       (ARRAY['Hindari permukiman padat baru; perbaiki drainase, jaga ruang resapan dan area tampung air.',
              'Pelihara saluran drainase dan batasi penutupan lahan resapan.',
              'Cocok untuk fasilitas dan posko darurat; jaga kebersihan saluran dan waspadai erosi di lereng.'])[h.kelas],
       'Copernicus DEM GLO-30 (ESA), resolusi +-30 m, model permukaan, diolah SIRANDU',
       h.geom
FROM hasil h
CROSS JOIN LATERAL (SELECT (ST_SummaryStats(ST_Clip(c.rast, 1, h.geom, true), 1, true)).* FROM dem_city c) s
WHERE NOT ST_IsEmpty(h.geom);
COMMIT;

-- Ringkasan hasil
SELECT kelas_elevasi, count(*) AS baris, round(avg(rata_elevasi_mdpl),1) AS rata2_mdpl,
       round((sum(ST_Area(geom::geography))/1e6)::numeric,1) AS luas_km2
FROM klasifikasi_elevasi GROUP BY kelas_elevasi ORDER BY 1;
