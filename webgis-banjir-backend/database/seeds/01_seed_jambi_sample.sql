-- ==============================================================================
-- DUMMY SEED DATA UNTUK PENGUJIAN SIRANDU KOTA JAMBI
-- File: 01_seed_jambi_sample.sql
-- ==============================================================================

-- 1. Insert Data Wilayah Administrasi (Sample Kecamatan & Kelurahan di Kota Jambi)
INSERT INTO wilayah_administrasi (kode_wilayah, nama_kecamatan, nama_kelurahan, status_siaga, ambang_hujan_waspada, ambang_hujan_siaga, geom)
VALUES 
('15.71.01.1001', 'Telanaipura', 'Telanaipura', 'Normal', 20.0, 50.0, 
 ST_Multi(ST_GeomFromText('POLYGON((103.595 -1.605, 103.620 -1.605, 103.620 -1.625, 103.595 -1.625, 103.595 -1.605))', 4326))),

('15.71.02.1001', 'Danau Teluk', 'Pasir Panjang', 'Waspada', 15.0, 45.0, 
 ST_Multi(ST_GeomFromText('POLYGON((103.570 -1.585, 103.600 -1.585, 103.600 -1.605, 103.570 -1.605, 103.570 -1.585))', 4326))),

('15.71.03.1001', 'Pelayangan', 'Arab Melayu', 'Normal', 15.0, 45.0, 
 ST_Multi(ST_GeomFromText('POLYGON((103.600 -1.575, 103.630 -1.575, 103.630 -1.595, 103.600 -1.595, 103.600 -1.575))', 4326))),

('15.71.04.1001', 'Jambi Timur', 'Kasang', 'Normal', 20.0, 50.0, 
 ST_Multi(ST_GeomFromText('POLYGON((103.620 -1.610, 103.645 -1.610, 103.645 -1.635, 103.620 -1.635, 103.620 -1.610))', 4326))),

('15.71.05.1001', 'Kotabaru', 'Paal Lima', 'Normal', 25.0, 55.0, 
 ST_Multi(ST_GeomFromText('POLYGON((103.600 -1.640, 103.630 -1.640, 103.630 -1.665, 103.600 -1.665, 103.600 -1.640))', 4326)))
ON CONFLICT (kode_wilayah) DO NOTHING;

-- 2. Insert Zona Rawan Banjir (Model 5 Kelas Hasil Skoring 6 Parameter)
INSERT INTO zona_rawan_banjir (wilayah_id, tingkat_rawan, skor_total, kelas_elevasi, rata_elevasi_mdpl, faktor_penyebab_utama, geom)
SELECT id, 'Sangat Tinggi', 88.5, 'Rendah', 7.5, 
       'Bantaran Sungai Batanghari (<100m), elevasi rendah, pasang air sungai dan drainase alami terhambat',
       ST_Multi(ST_GeomFromText('POLYGON((103.575 -1.590, 103.595 -1.590, 103.595 -1.602, 103.575 -1.602, 103.575 -1.590))', 4326))
FROM wilayah_administrasi WHERE nama_kelurahan = 'Pasir Panjang' LIMIT 1;

INSERT INTO zona_rawan_banjir (wilayah_id, tingkat_rawan, skor_total, kelas_elevasi, rata_elevasi_mdpl, faktor_penyebab_utama, geom)
SELECT id, 'Tinggi', 72.0, 'Rendah', 9.0, 
       'Daerah limpasan air dan sedimentasi anak sungai, drainase padat pemukiman',
       ST_Multi(ST_GeomFromText('POLYGON((103.625 -1.615, 103.640 -1.615, 103.640 -1.630, 103.625 -1.630, 103.625 -1.615))', 4326))
FROM wilayah_administrasi WHERE nama_kelurahan = 'Kasang' LIMIT 1;

INSERT INTO zona_rawan_banjir (wilayah_id, tingkat_rawan, skor_total, kelas_elevasi, rata_elevasi_mdpl, faktor_penyebab_utama, geom)
SELECT id, 'Sedang', 54.0, 'Sedang', 14.5, 
       'Genangan air lokal akibat curah hujan tinggi dan kapasitas parit perkotaan tidak memadai',
       ST_Multi(ST_GeomFromText('POLYGON((103.600 -1.610, 103.615 -1.610, 103.615 -1.622, 103.600 -1.622, 103.600 -1.610))', 4326))
FROM wilayah_administrasi WHERE nama_kelurahan = 'Telanaipura' LIMIT 1;

-- 3. Insert Titik Posko Pengungsian (F07)
INSERT INTO posko_pengungsian (nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, geom)
VALUES
('Posko Utama BPBD Kota Jambi', 'Jl. H. Agus Salim No. 1, Paal Lima, Kec. Kotabaru', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Paal Lima' LIMIT 1),
 350, 45, 'Rahmat Hidayat (BPBD) - 0812-7483-9921', 'Dapur Umum, Tenda Medis, Ambulance, Logistik Makanan', true,
 ST_SetSRID(ST_MakePoint(103.6120, -1.6480), 4326)),

('Posko Evakuasi GOR Kotabaru', 'Komplek Stadion Mini Kotabaru, Kota Jambi', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Paal Lima' LIMIT 1),
 500, 120, 'Dinas Sosial Kota Jambi - 0813-6622-1100', 'Aula Besar, Kasur Lipat, Toilet Bersih, Dapur Umum', true,
 ST_SetSRID(ST_MakePoint(103.6165, -1.6425), 4326)),

('Posko Siaga Banjir Danau Teluk', 'Halaman Kantor Camat Danau Teluk, Pasir Panjang', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Pasir Panjang' LIMIT 1),
 150, 60, 'M. Yusuf (Satgas Kelurahan) - 0852-8819-3344', 'Perahu Karet Evakuasi, Genset, Posko Kesehatan', true,
 ST_SetSRID(ST_MakePoint(103.5860, -1.5930), 4326));

-- 4. Insert Titik Sumber Air Bersih (F08)
INSERT INTO sumber_air_bersih (nama_titik, alamat, wilayah_id, pengelola, jam_operasional, debit_liter_detik, status_layak, keterangan, geom)
VALUES
('Kran Umum PDAM Tirta Mayang Broni', 'Jl. Slamet Riyadi No. 5, Broni, Telanaipura', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Telanaipura' LIMIT 1),
 'PDAM Tirta Mayang Jambi', '24 Jam Non-Stop', 15.5, true, 'Air olahan siap pakai, disterilisasi UV darurat',
 ST_SetSRID(ST_MakePoint(103.6015, -1.6080), 4326)),

('Tandon Air Darurat BPBD Pasir Panjang', 'Dekat Masjid Al-Hidayah, Pasir Panjang, Danau Teluk', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Pasir Panjang' LIMIT 1),
 'BPBD Kota Jambi & PMI', '06:00 - 21:00 WIB', 8.0, true, 'Kapasitas tandon 5000 Liter, diisi ulang mobil tangki harian',
 ST_SetSRID(ST_MakePoint(103.5845, -1.5950), 4326));

-- 5. Insert Titik Banjir Historis (F10 - Validasi Banjir Feb-Mar 2025)
INSERT INTO titik_banjir_historis (nama_lokasi, wilayah_id, tahun_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan, geom)
VALUES
('RT 08 Kelurahan Pasir Panjang', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Pasir Panjang' LIMIT 1),
 2025, 110, 72, 'Luapan langsung Sungai Batanghari merendam 45 rumah warga',
 ST_SetSRID(ST_MakePoint(103.5820, -1.5925), 4326)),

('Kawasan Kasang Jaya (Dekat Pelabuhan)', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Kasang' LIMIT 1),
 2025, 65, 24, 'Limpasan air sungai dan saluran pembuang tersumbat lumpur pasang',
 ST_SetSRID(ST_MakePoint(103.6310, -1.6210), 4326)),

('Kawasan Danau Sipin (Legok)', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kelurahan = 'Telanaipura' LIMIT 1),
 2025, 85, 48, 'Genangan meluap dari danau menutupi jalan utama warga',
 ST_SetSRID(ST_MakePoint(103.6030, -1.6020), 4326));
