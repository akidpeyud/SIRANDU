-- ==============================================================================
-- MIGRASI LAYER SUNGAI & TITIK KUMPUL EVAKUASI (LAYER 3 & 4)
-- ==============================================================================

-- 1. Tabel Aliran Sungai Kota Jambi
CREATE TABLE IF NOT EXISTS sungai_kota_jambi (
    id SERIAL PRIMARY KEY,
    nama_sungai VARCHAR(100) NOT NULL,
    tipe VARCHAR(50) DEFAULT 'Sungai Utama',
    lebar_rata_rata_meter NUMERIC(6,1) DEFAULT 300.0,
    geom GEOMETRY(LineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sungai_geom ON sungai_kota_jambi USING GIST(geom);

DELETE FROM sungai_kota_jambi;

INSERT INTO sungai_kota_jambi (nama_sungai, tipe, lebar_rata_rata_meter, geom)
VALUES
('Sungai Batanghari (Aliran Utama Kota Jambi)', 'Sungai Utama', 350.0,
 ST_GeomFromText('LINESTRING(103.545 -1.580, 103.570 -1.593, 103.595 -1.591, 103.615 -1.586, 103.640 -1.588, 103.670 -1.595)', 4326)),

('Sungai Asam (Anak Sungai Batanghari)', 'Anak Sungai', 25.0,
 ST_GeomFromText('LINESTRING(103.605 -1.635, 103.608 -1.618, 103.605 -1.602, 103.608 -1.588)', 4326)),

('Sungai Tembuku / Danau Sipin', 'Anak Sungai', 20.0,
 ST_GeomFromText('LINESTRING(103.580 -1.615, 103.595 -1.608, 103.602 -1.600)', 4326));

-- 2. Tambah Data Titik Kumpul Evakuasi (Assembly Points) ke Tabel posko_pengungsian
INSERT INTO posko_pengungsian (nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, geom)
VALUES
('Titik Kumpul Lapangan Kantor Walikota Jambi', 'Jl. Jend. Basuki Rahmat, Paal Lima, Kec. Kotabaru',
 (SELECT id FROM wilayah_administrasi WHERE nama_kecamatan = 'Kotabaru' LIMIT 1),
 1000, 0, 'Satpol PP & BPBD Jambi - 0812-7000-1122', 'Area Terbuka Hijau, Posko Komando, Akses Helipad Darurat', true,
 ST_SetSRID(ST_MakePoint(103.6090, -1.6410), 4326)),

('Titik Kumpul Lapangan Tri Lomba Juang (KONI Jambi)', 'Jl. Kolonel Abunjani, Simpang Sipin',
 (SELECT id FROM wilayah_administrasi WHERE nama_kecamatan = 'Telanaipura' LIMIT 1),
 800, 0, 'Relawan PMI Kota Jambi - 0813-6611-3322', 'Lapangan Luas Bebas Banjir, Tenda Transit Darurat', true,
 ST_SetSRID(ST_MakePoint(103.5970, -1.6130), 4326))
ON CONFLICT DO NOTHING;
