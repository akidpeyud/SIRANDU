-- ==============================================================================
-- UPDATE JARINGAN JALAN ARTERI KOTA JAMBI & POSKO EVAKUASI LENGKAP
-- Menghubungkan Alam Barajo, Kotabaru, Telanaipura, Pasar, dan Danau Teluk
-- ==============================================================================

-- 1. Tambah Posko Pengungsian di Alam Barajo (Dekat Kenali Besar / Simpang Rimbo)
INSERT INTO posko_pengungsian (nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, geom)
VALUES
('Posko Evakuasi Terpadu Alam Barajo', 'Jl. Kapten Pattimura No. 12 (Komplek Kantor Camat Alam Barajo), Kenali Besar', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kecamatan = 'Alam Barajo' LIMIT 1),
 400, 25, 'Agus Setiawan (Satgas Alam Barajo) - 0812-9988-7711', 'Aula Serbaguna, Dapur Umum, Tenda Kesehatan PMI, Genset', true,
 ST_SetSRID(ST_MakePoint(103.5685, -1.6325), 4326))
ON CONFLICT DO NOTHING;

-- 2. Bersihkan & Perbarui Jaringan Jalan Topologi (pgRouting) Kota Jambi
DELETE FROM jaringan_jalan_evakuasi;

INSERT INTO jaringan_jalan_evakuasi (osm_id, nama_jalan, tipe_jalan, panjang_meter, source, target, cost, reverse_cost, tergenang, faktor_penalti, geom)
VALUES
-- === KORIDOR ALAM BARAJO ===
-- Segmen 101: Simpang Rimbo ke Simpang Mayang/Kenali Besar (Node 20 -> 21)
(2001, 'Jl. Lintas Timur (Simpang Rimbo)', 'primary', 750.0, 20, 21, 750.0, 750.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5580 -1.6240, 103.5652 -1.6281)', 4326)),

-- Segmen 102: Kenali Besar ke Simpang Camat Alam Barajo (Node 21 -> 22)
(2002, 'Jl. Kapten Pattimura (Arah Posko Alam Barajo)', 'primary', 550.0, 21, 22, 550.0, 550.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5652 -1.6281, 103.5685 -1.6325)', 4326)),

-- Segmen 103: Posko Alam Barajo ke Simpang Mayang Mangurai (Node 22 -> 23)
(2003, 'Jl. Kapten Pattimura (Arah Simpang Rawasari)', 'primary', 1400.0, 22, 23, 1400.0, 1400.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5685 -1.6325, 103.5800 -1.6310)', 4326)),

-- Segmen 104: Simpang Rawasari ke Simpang Kawat (Node 23 -> 24)
(2004, 'Jl. Ir. H. Juanda (Mayang)', 'secondary', 1600.0, 23, 24, 1600.0, 1600.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5800 -1.6310, 103.5950 -1.6280)', 4326)),

-- Segmen 105: Simpang Kawat ke Simpang Tugu Keris Kotabaru (Node 24 -> 25)
(2005, 'Jl. Pangeran Hidayat (Arah Kotabaru)', 'primary', 1200.0, 24, 25, 1200.0, 1200.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5950 -1.6280, 103.6050 -1.6380)', 4326)),

-- Segmen 106: Tugu Keris ke Posko Utama BPBD / GOR Kotabaru (Node 25 -> 26)
(2006, 'Jl. H. Agus Salim (Komplek Stadion & BPBD)', 'primary', 800.0, 25, 26, 800.0, 800.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.6050 -1.6380, 103.6120 -1.6480)', 4326)),

-- === KORIDOR SIPIN & TELANAIPURA ===
-- Segmen 107: Simpang Rawasari tembus ke Sipin (Node 23 -> 27)
(2007, 'Jl. Sunan Giri (Arah Simpang Sipin)', 'secondary', 1700.0, 23, 27, 1700.0, 1700.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5800 -1.6310, 103.5920 -1.6150)', 4326)),

-- Segmen 108: Simpang Sipin ke Telanaipura (Node 27 -> 28)
(2008, 'Jl. Kolonel Abunjani (Sipin)', 'primary', 900.0, 27, 28, 900.0, 900.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5920 -1.6150, 103.6015 -1.6080)', 4326)),

-- Segmen 109: Telanaipura ke Simpang BI (Node 28 -> 29)
(2009, 'Jl. Jenderal A. Yani (Telanaipura)', 'primary', 850.0, 28, 29, 850.0, 850.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.6015 -1.6080, 103.6080 -1.6180)', 4326)),

-- Segmen 110: Simpang BI menyambung ke Tugu Keris Kotabaru (Node 29 -> 25)
(2010, 'Jl. Jenderal Basuki Rahmat', 'primary', 2100.0, 29, 25, 2100.0, 2100.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.6080 -1.6180, 103.6050 -1.6380)', 4326)),

-- === KORIDOR SEBERANG KOTA JAMBI (DANAU TELUK) ===
-- Segmen 111: Danau Teluk Pasir Panjang (Node 30 -> 31)
(2011, 'Jl. KH. Hasan Anang', 'secondary', 350.0, 30, 31, 350.0, 350.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5850 -1.5930, 103.5870 -1.5940)', 4326)),

-- Segmen 112: Simpang Pasir Panjang ke Kantor Camat Danau Teluk (Node 31 -> 32)
(2012, 'Jl. Lintas Danau Teluk (Posko Camat)', 'tertiary', 120.0, 31, 32, 120.0, 120.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5870 -1.5940, 103.5860 -1.5930)', 4326)),

-- Segmen 113: Jembatan Batanghari I menghubungkan Telanaipura ke Danau Teluk (Node 28 -> 31)
(2013, 'Jembatan Batanghari I (Aur Duri)', 'primary', 1800.0, 28, 31, 1800.0, 1800.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.6015 -1.6080, 103.5870 -1.5940)', 4326));
