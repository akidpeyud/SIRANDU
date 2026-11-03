-- ==============================================================================
-- FIX TOPOLOGI JALAN, RIVER BARRIER, DAN POSKO TELANAIPURA
-- Menjamin rute warga tidak menyeberang sungai sembarangan
-- ==============================================================================

-- 1. Tambah Posko Evakuasi di Telanaipura
INSERT INTO posko_pengungsian (nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, geom)
VALUES
('Posko Evakuasi Telanaipura (Komplek Kantor Gubernur)', 'Jl. RM. Nur Atmadibrata (Depan Lapangan Kantor Gubernur), Telanaipura', 
 (SELECT id FROM wilayah_administrasi WHERE nama_kecamatan = 'Telanaipura' LIMIT 1),
 500, 30, 'Dedy Kurniawan (Satgas Telanaipura) - 0811-7400-2211', 'Aula Utama, Tenda Medis RSUD, Dapur Umum, Ambulance', true,
 ST_SetSRID(ST_MakePoint(103.5760, -1.6060), 4326))
ON CONFLICT DO NOTHING;

-- 2. Tambah Segmen Jalan Arteri Telanaipura Barat & Penghubung ke Alam Barajo
INSERT INTO jaringan_jalan_evakuasi (osm_id, nama_jalan, tipe_jalan, panjang_meter, source, target, cost, reverse_cost, tergenang, faktor_penalti, geom)
VALUES
-- Segmen 201: Simpang Mayang (Node 23) ke Simpang Mendalo / UNJA Telanaipura (Node 40)
(3001, 'Jl. Arief Rahman Hakim (Telanaipura Barat)', 'primary', 1200.0, 23, 40, 1200.0, 1200.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5800 -1.6310, 103.5760 -1.6150)', 4326)),

-- Segmen 202: Telanaipura Barat ke Lapangan Kantor Gubernur / Posko Telanaipura (Node 40 -> 41)
(3002, 'Jl. RM. Nur Atmadibrata (Posko Telanaipura)', 'secondary', 850.0, 40, 41, 850.0, 850.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5760 -1.6150, 103.5760 -1.6060)', 4326)),

-- Segmen 203: Posko Telanaipura ke Simpang BI (Node 41 -> 28)
(3003, 'Jl. Jenderal A. Yani (Arah Simpang BI)', 'primary', 2600.0, 41, 28, 2600.0, 2600.0, false, 1.0,
 ST_GeomFromText('LINESTRING(103.5760 -1.6060, 103.6015 -1.6080)', 4326));
