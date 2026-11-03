-- ==============================================================================
-- SISTEM INFORMASI RAWAN BENCANA TERPADU (SIRANDU) - KOTA JAMBI
-- Migrasi: 02_create_kecamatan_cuaca.sql (Fitur F04 & F05)
-- ==============================================================================

-- 1. Tabel Master 11 Kecamatan Kota Jambi
CREATE TABLE IF NOT EXISTS kecamatan (
    id SERIAL PRIMARY KEY,
    nama_kecamatan VARCHAR(100) UNIQUE NOT NULL,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    curah_hujan_terkini NUMERIC(5,2) DEFAULT 0.0,
    intensitas_terkini VARCHAR(50) DEFAULT 'Berawan / Tidak Hujan',
    status_peringatan VARCHAR(20) DEFAULT 'Normal' 
        CHECK (status_peringatan IN ('Normal', 'Waspada', 'Siaga')),
    suhu_celsius NUMERIC(4,1) DEFAULT 28.0,
    kelembapan_persen INT DEFAULT 80,
    sumber_data VARCHAR(100) DEFAULT 'Open-Meteo Weather API',
    terakhir_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_delayed BOOLEAN DEFAULT false, -- True jika API eksternal gagal diakses (resilience/fallback indicator)
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_kecamatan_geom ON kecamatan USING GIST(geom);

-- 2. Tabel Riwayat / Log Curah Hujan untuk Grafik 24 Jam & Tren
CREATE TABLE IF NOT EXISTS log_curah_hujan (
    id SERIAL PRIMARY KEY,
    kecamatan_id INT REFERENCES kecamatan(id) ON DELETE CASCADE,
    curah_hujan NUMERIC(5,2) NOT NULL,
    intensitas VARCHAR(50) NOT NULL,
    suhu NUMERIC(4,1),
    kelembapan INT,
    waktu TIMESTAMP WITH TIME ZONE NOT NULL,
    sumber VARCHAR(100) DEFAULT 'Open-Meteo Weather API',
    is_delayed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_cuaca_kec_waktu ON log_curah_hujan (kecamatan_id, waktu DESC);

-- 3. Seeding Master Data 11 Kecamatan di Kota Jambi
INSERT INTO kecamatan (nama_kecamatan, latitude, longitude, geom)
VALUES
('Kota Baru', -1.6366, 103.6067, ST_SetSRID(ST_MakePoint(103.6067, -1.6366), 4326)),
('Alam Barajo', -1.6358, 103.5681, ST_SetSRID(ST_MakePoint(103.5681, -1.6358), 4326)),
('Jambi Selatan', -1.6225, 103.6358, ST_SetSRID(ST_MakePoint(103.6358, -1.6225), 4326)),
('Paal Merah', -1.6442, 103.6550, ST_SetSRID(ST_MakePoint(103.6550, -1.6442), 4326)),
('Jelutung', -1.6094, 103.6186, ST_SetSRID(ST_MakePoint(103.6186, -1.6094), 4326)),
('Pasar Jambi', -1.5917, 103.6158, ST_SetSRID(ST_MakePoint(103.6158, -1.5917), 4326)),
('Telanaipura', -1.6053, 103.5756, ST_SetSRID(ST_MakePoint(103.5756, -1.6053), 4326)),
('Danau Sipin', -1.6022, 103.5964, ST_SetSRID(ST_MakePoint(103.5964, -1.6022), 4326)),
('Danau Teluk', -1.5681, 103.5908, ST_SetSRID(ST_MakePoint(103.5908, -1.5681), 4326)),
('Pelayangan', -1.5683, 103.6169, ST_SetSRID(ST_MakePoint(103.6169, -1.5683), 4326)),
('Jambi Timur', -1.5903, 103.6422, ST_SetSRID(ST_MakePoint(103.6422, -1.5903), 4326))
ON CONFLICT (nama_kecamatan) DO UPDATE 
SET latitude = EXCLUDED.latitude, 
    longitude = EXCLUDED.longitude,
    geom = EXCLUDED.geom;
