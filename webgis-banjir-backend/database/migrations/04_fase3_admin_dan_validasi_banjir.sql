-- ==============================================================================
-- SIRANDU: FASE 3 (F07 POSKO, F08 SUMBER AIR BERSIH, F10 PANEL ADMIN & HISTORIS)
-- ==============================================================================

-- 1. Penyesuaian Kolom Tabel posko_pengungsian
ALTER TABLE posko_pengungsian 
    ADD COLUMN IF NOT EXISTS nama VARCHAR(200),
    ADD COLUMN IF NOT EXISTS kontak VARCHAR(150),
    ADD COLUMN IF NOT EXISTS kapasitas INTEGER DEFAULT 100;

ALTER TABLE posko_pengungsian ALTER COLUMN kontak TYPE VARCHAR(150);

UPDATE posko_pengungsian 
SET nama = COALESCE(nama, nama_posko),
    kontak = COALESCE(kontak, kontak_pj),
    kapasitas = COALESCE(kapasitas, kapasitas_jiwa);

-- 2. Penyesuaian Kolom Tabel sumber_air_bersih
ALTER TABLE sumber_air_bersih 
    ADD COLUMN IF NOT EXISTS nama_lokasi VARCHAR(200),
    ADD COLUMN IF NOT EXISTS jenis VARCHAR(100) DEFAULT 'PDAM / Kran Komunal',
    ADD COLUMN IF NOT EXISTS status_aktif BOOLEAN DEFAULT TRUE;

UPDATE sumber_air_bersih 
SET nama_lokasi = COALESCE(nama_lokasi, nama_titik),
    status_aktif = COALESCE(status_aktif, status_layak);

-- 3. Penyesuaian Tabel titik_banjir_historis
ALTER TABLE titik_banjir_historis 
    ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tanggal_kejadian DATE DEFAULT '2025-02-15';

-- Seeding Data Titik Banjir Historis (Banjir Bandang & Luapan Sungai Batanghari Februari 2025 di Kota Jambi)
INSERT INTO titik_banjir_historis (nama_lokasi, kecamatan, tanggal_kejadian, tahun_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan, geom)
VALUES
('Bantaran Legok Danau Sipin', 'Danau Sipin', '2025-02-12', 2025, 120, 36, 
 'Luapan air Danau Sipin merendam pemukiman warga bantaran setinggi 1.2 meter selama 36 jam akibat hujan ekstrem berturut-turut.',
 ST_SetSRID(ST_MakePoint(103.5935, -1.5995), 4326)),

('Kawasan Buluran Kenali Depan RSUD Raden Mattaher', 'Telanaipura', '2025-02-14', 2025, 80, 18, 
 'Genangan air limpasan drainase primer memutus akses jalan utama Telanaipura.',
 ST_SetSRID(ST_MakePoint(103.5780, -1.6025), 4326)),

('Pemukiman Pasir Panjang Dekat Jembatan Gentala Arasy', 'Danau Teluk', '2025-02-15', 2025, 150, 48, 
 'Banjir pasang Sungai Batanghari menggenangi 140 rumah panggung di kawasan seberang Kota Jambi.',
 ST_SetSRID(ST_MakePoint(103.5850, -1.5720), 4326)),

('Bagan Pete Lingkungan RT 12', 'Alam Barajo', '2025-02-16', 2025, 95, 24, 
 'Limpasan air sungai kecil dan cekungan alami di perbatasan perumahan padat.',
 ST_SetSRID(ST_MakePoint(103.5550, -1.6420), 4326)),

('Perumahan Eka Jaya Paal Merah', 'Paal Merah', '2025-02-17', 2025, 75, 12, 
 'Penyempitan saluran gorong-gorong pembuangan air menuju rawa alami.',
 ST_SetSRID(ST_MakePoint(103.6620, -1.6380), 4326)),

('Kawasan Kasang Jaya Pintu Air Batanghari', 'Jambi Timur', '2025-02-15', 2025, 110, 30, 
 'Air balik (backwater) dari Sungai Batanghari masuk ke pemukiman dan pertokoan Kasang.',
 ST_SetSRID(ST_MakePoint(103.6380, -1.5950), 4326))
ON CONFLICT DO NOTHING;

-- 4. Tabel Ruas Jalan Tergenang (LineString) untuk Pemantauan Jalur Evakuasi Aman
CREATE TABLE IF NOT EXISTS ruas_jalan_tergenang (
    id SERIAL PRIMARY KEY,
    nama_jalan VARCHAR(150) NOT NULL,
    kecamatan VARCHAR(100),
    status_tergenang BOOLEAN DEFAULT TRUE,
    kedalaman_genangan_cm INTEGER DEFAULT 30,
    keterangan TEXT,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ruas_jalan_tergenang_geom ON ruas_jalan_tergenang USING GIST(geom);

-- Seeding Awal Sampel Jalan Tergenang (Jl. Slamet Riyadi & Jl. RE Martadinata)
INSERT INTO ruas_jalan_tergenang (nama_jalan, kecamatan, status_tergenang, kedalaman_genangan_cm, keterangan, geom)
VALUES
('Jl. Slamet Riyadi (Bantaran Danau Sipin)', 'Danau Sipin', TRUE, 45, 
 'Genangan setinggi 45 cm, tidak dapat dilalui kendaraan roda 2 dan sedan rendah',
 ST_SetSRID(ST_GeomFromText('LINESTRING(103.5900 -1.6020, 103.5980 -1.6010, 103.6050 -1.6000)'), 4326)),

('Jl. RE Martadinata (Telanaipura)', 'Telanaipura', TRUE, 35, 
 'Genangan air luapan drainase sepanjang 300 meter',
 ST_SetSRID(ST_GeomFromText('LINESTRING(103.5750 -1.6030, 103.5820 -1.6040)'), 4326))
ON CONFLICT DO NOTHING;

-- 5. Tabel admin_users (Autentikasi Administrator BPBD & Petugas Lapangan)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'admin', -- 'superadmin', 'admin', 'petugas_bpbd'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel pengaturan_ambang (Konfigurasi Ambang Batas Curah Hujan BMKG Waspada/Siaga)
CREATE TABLE IF NOT EXISTS pengaturan_ambang (
    id SERIAL PRIMARY KEY,
    parameter VARCHAR(50) NOT NULL UNIQUE,
    ambang_waspada NUMERIC(6, 2) NOT NULL DEFAULT 5.0,
    ambang_siaga NUMERIC(6, 2) NOT NULL DEFAULT 10.0,
    satuan VARCHAR(20) DEFAULT 'mm/jam',
    deskripsi TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pengaturan_ambang (parameter, ambang_waspada, ambang_siaga, satuan, deskripsi)
VALUES 
('curah_hujan_per_jam', 5.00, 10.00, 'mm/jam', 'Ambang intensitas curah hujan per jam standar BMKG untuk memicu status Waspada dan Siaga di Kota Jambi'),
('curah_hujan_harian', 50.00, 100.00, 'mm/hari', 'Ambang akumulasi hujan 24 jam untuk peringatan potensi banjir kiriman Batanghari')
ON CONFLICT (parameter) DO UPDATE
SET ambang_waspada = EXCLUDED.ambang_waspada,
    ambang_siaga = EXCLUDED.ambang_siaga;
