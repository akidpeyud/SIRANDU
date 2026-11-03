-- ==============================================================================
-- SIRANDU: SISTEM INFORMASI RAWAN BENCANA TERPADU KOTA JAMBI
-- INIT SCRIPT: FASE 1 (MODULARISASI & POSTGIS) & FASE 2 (SCHEDULER CUACA F04-F05)
-- ==============================================================================

-- 1. Aktifkan Ekstensi PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Buat Tabel Master: kecamatan (11 Kecamatan Kota Jambi)
CREATE TABLE IF NOT EXISTS kecamatan (
    id SERIAL PRIMARY KEY,
    nama_kecamatan VARCHAR(100) NOT NULL UNIQUE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    curah_hujan_terkini NUMERIC(6, 2) DEFAULT 0.00,
    intensitas_terkini VARCHAR(50) DEFAULT 'Berawan / Tidak Hujan',
    status_peringatan VARCHAR(20) DEFAULT 'Normal', -- 'Normal', 'Waspada', 'Siaga'
    suhu_celsius NUMERIC(4, 1) DEFAULT 28.0,
    kelembapan_persen INTEGER DEFAULT 80,
    sumber_data VARCHAR(100) DEFAULT 'Open-Meteo Weather API',
    terakhir_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_delayed BOOLEAN DEFAULT FALSE,
    geom GEOMETRY(Point, 4326)
);

-- Index Spasial & Geometri
CREATE INDEX IF NOT EXISTS idx_kecamatan_geom ON kecamatan USING GIST(geom);

-- 3. Buat Tabel Log Riwayat: log_curah_hujan (Grafik 24 Jam F04)
CREATE TABLE IF NOT EXISTS log_curah_hujan (
    id BIGSERIAL PRIMARY KEY,
    kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
    curah_hujan NUMERIC(6, 2) NOT NULL,
    intensitas VARCHAR(50) NOT NULL,
    suhu NUMERIC(4, 1),
    kelembapan INTEGER,
    waktu TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sumber VARCHAR(100) DEFAULT 'Open-Meteo Weather API',
    is_delayed BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_log_waktu_kec UNIQUE (kecamatan_id, waktu)
);

CREATE INDEX IF NOT EXISTS idx_log_curah_hujan_kec_waktu ON log_curah_hujan(kecamatan_id, waktu DESC);

-- 4. Seeding Data Master 11 Kecamatan Kota Jambi Beserta Titik Centroid-nya
INSERT INTO kecamatan (nama_kecamatan, latitude, longitude, curah_hujan_terkini, intensitas_terkini, status_peringatan, sumber_data, geom)
VALUES 
    ('Kota Baru',    -1.6366000, 103.6067000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6067000, -1.6366000), 4326)),
    ('Alam Barajo',   -1.6358000, 103.5681000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.5681000, -1.6358000), 4326)),
    ('Jambi Selatan', -1.6225000, 103.6358000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6358000, -1.6225000), 4326)),
    ('Paal Merah',    -1.6442000, 103.6550000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6550000, -1.6442000), 4326)),
    ('Jelutung',      -1.6094000, 103.6186000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6186000, -1.6094000), 4326)),
    ('Pasar Jambi',   -1.5917000, 103.6158000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6158000, -1.5917000), 4326)),
    ('Telanaipura',   -1.6053000, 103.5756000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.5756000, -1.6053000), 4326)),
    ('Danau Sipin',   -1.6022000, 103.5964000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.5964000, -1.6022000), 4326)),
    ('Danau Teluk',   -1.5681000, 103.5908000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.5908000, -1.5681000), 4326)),
    ('Pelayangan',    -1.5683000, 103.6169000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6169000, -1.5683000), 4326)),
    ('Jambi Timur',   -1.5903000, 103.6422000, 0.0, 'Berawan / Tidak Hujan', 'Normal', 'Open-Meteo Weather API', ST_SetSRID(ST_MakePoint(103.6422000, -1.5903000), 4326))
ON CONFLICT (nama_kecamatan) DO UPDATE 
SET latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    geom = EXCLUDED.geom;
