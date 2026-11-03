-- ==============================================================================
-- SISTEM INFORMASI RAWAN BENCANA TERPADU (SIRANDU) - KOTA JAMBI
-- File Migrasi: 01_init_sirandu_schema.sql
-- Kompatibel: PostgreSQL 14+ dengan PostGIS 3.x dan pgRouting 3.x
-- ==============================================================================

-- 1. Pastikan Ekstensi Spasial Aktif
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- ------------------------------------------------------------------------------
-- TABEL 1: wilayah_administrasi (F01, F05)
-- Menyimpan batas poligon 11 kecamatan dan kelurahan di Kota Jambi serta status siaga
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wilayah_administrasi (
    id SERIAL PRIMARY KEY,
    kode_wilayah VARCHAR(20) UNIQUE,
    nama_kecamatan VARCHAR(100) NOT NULL,
    nama_kelurahan VARCHAR(100) NOT NULL,
    status_siaga VARCHAR(20) NOT NULL DEFAULT 'Normal' 
        CHECK (status_siaga IN ('Normal', 'Waspada', 'Siaga')),
    ambang_hujan_waspada NUMERIC(5,2) DEFAULT 20.0,
    ambang_hujan_siaga NUMERIC(5,2) DEFAULT 50.0,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wilayah_admin_geom ON wilayah_administrasi USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_wilayah_admin_kec_kel ON wilayah_administrasi (nama_kecamatan, nama_kelurahan);

-- ------------------------------------------------------------------------------
-- TABEL 2: zona_rawan_banjir (F02, F03)
-- Hasil model overlay 6 parameter QGIS (5 kelas kerawanan & elevasi DEMNAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zona_rawan_banjir (
    id SERIAL PRIMARY KEY,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE CASCADE,
    tingkat_rawan VARCHAR(30) NOT NULL 
        CHECK (tingkat_rawan IN ('Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi')),
    skor_total NUMERIC(5,2) NOT NULL, -- Skor AHP 0 - 100
    kelas_elevasi VARCHAR(20) NOT NULL DEFAULT 'Sedang' 
        CHECK (kelas_elevasi IN ('Rendah', 'Sedang', 'Tinggi')),
    rata_elevasi_mdpl NUMERIC(5,2) DEFAULT 15.0,
    faktor_penyebab_utama TEXT, -- Contoh: "Dekat Sungai Batanghari (<150m), elevasi rendah, drainase buruk"
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zona_rawan_geom ON zona_rawan_banjir USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_zona_rawan_tingkat ON zona_rawan_banjir (tingkat_rawan);

-- ------------------------------------------------------------------------------
-- TABEL 3: pemantauan_cuaca (F04, F05)
-- Riwayat data curah hujan BMKG/Open-Meteo per wilayah untuk grafik tren
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pemantauan_cuaca (
    id SERIAL PRIMARY KEY,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE CASCADE,
    curah_hujan NUMERIC(6,2) NOT NULL DEFAULT 0.0, -- mm/jam atau mm/hari
    intensitas_bmkg VARCHAR(50) NOT NULL, -- 'Berawan', 'Hujan Ringan', 'Hujan Sedang', 'Hujan Lebat', 'Hujan Ekstrem'
    suhu_celsius NUMERIC(4,1),
    kelembapan_persen INT,
    sumber_data VARCHAR(100) DEFAULT 'Open-Meteo & BMKG CAP',
    waktu_pengamatan TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cuaca_wilayah_waktu ON pemantauan_cuaca (wilayah_id, waktu_pengamatan DESC);

-- ------------------------------------------------------------------------------
-- TABEL 4: posko_pengungsian (F07)
-- Lokasi posko evakuasi bencana, kapasitas, kontak darurat, dan status aktif
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posko_pengungsian (
    id SERIAL PRIMARY KEY,
    nama_posko VARCHAR(150) NOT NULL,
    alamat TEXT NOT NULL,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE SET NULL,
    kapasitas_jiwa INT NOT NULL DEFAULT 50,
    terisi_jiwa INT NOT NULL DEFAULT 0,
    kontak_pj VARCHAR(100), -- Contoh: "Bpk. Rahmat (BPBD Kota Jambi) - 0812xxxx"
    fasilitas TEXT, -- Contoh: "Dapur Umum, Tenda Medis, Genset, Toilet Portabel"
    status_aktif BOOLEAN NOT NULL DEFAULT true,
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posko_geom ON posko_pengungsian USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_posko_aktif ON posko_pengungsian (status_aktif);

-- ------------------------------------------------------------------------------
-- TABEL 5: sumber_air_bersih (F08)
-- Titik pasokan air bersih steril pasca-banjir (PDAM / Tandon BPBD)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sumber_air_bersih (
    id SERIAL PRIMARY KEY,
    nama_titik VARCHAR(150) NOT NULL,
    alamat TEXT NOT NULL,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE SET NULL,
    pengelola VARCHAR(100) NOT NULL DEFAULT 'PDAM Tirta Mayang',
    jam_operasional VARCHAR(100) DEFAULT '24 Jam',
    debit_liter_detik NUMERIC(6,2),
    status_layak BOOLEAN NOT NULL DEFAULT true,
    keterangan TEXT,
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_air_bersih_geom ON sumber_air_bersih USING GIST(geom);

-- ------------------------------------------------------------------------------
-- TABEL 6: jaringan_jalan_evakuasi (F09 - pgRouting Engine)
-- Graf topologi jaringan jalan Kota Jambi untuk rute evakuasi peka risiko
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jaringan_jalan_evakuasi (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    nama_jalan VARCHAR(150),
    tipe_jalan VARCHAR(50) DEFAULT 'residential', -- primary, secondary, tertiary, residential
    panjang_meter DOUBLE PRECISION NOT NULL,
    source BIGINT NOT NULL, -- ID node awal (pgRouting)
    target BIGINT NOT NULL, -- ID node akhir (pgRouting)
    cost DOUBLE PRECISION NOT NULL, -- Biaya tempuh (panjang_meter + penalti)
    reverse_cost DOUBLE PRECISION NOT NULL, -- -1 jika one-way
    tergenang BOOLEAN NOT NULL DEFAULT false, -- Flag manual admin jika jalan terendam banjir
    tinggi_genangan_cm NUMERIC(5,1) DEFAULT 0.0,
    faktor_penalti NUMERIC(6,2) DEFAULT 1.0, -- Pengali bobot (naik drastis jika lewati zona tinggi/tergenang)
    geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jalan_geom ON jaringan_jalan_evakuasi USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_jalan_source ON jaringan_jalan_evakuasi (source);
CREATE INDEX IF NOT EXISTS idx_jalan_target ON jaringan_jalan_evakuasi (target);
CREATE INDEX IF NOT EXISTS idx_jalan_tergenang ON jaringan_jalan_evakuasi (tergenang);

-- ------------------------------------------------------------------------------
-- TABEL 7: titik_banjir_historis (F10 - Validasi Model)
-- 18 titik banjir historis (misal kejadian Feb-Maret 2025) untuk validasi akurasi
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS titik_banjir_historis (
    id SERIAL PRIMARY KEY,
    nama_lokasi VARCHAR(150) NOT NULL,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE SET NULL,
    tahun_kejadian INT NOT NULL DEFAULT 2025,
    tinggi_genangan_cm INT NOT NULL,
    lama_genangan_jam INT,
    keterangan TEXT,
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_banjir_historis_geom ON titik_banjir_historis USING GIST(geom);

-- ------------------------------------------------------------------------------
-- TABEL 8: pelanggan_notifikasi (F06 - Sistem Langganan Email Warga)
-- Menghargai privasi: hanya menyimpan email, wilayah terpilih, dan token unsubscribe
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pelanggan_notifikasi (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    wilayah_id INT NOT NULL REFERENCES wilayah_administrasi(id) ON DELETE CASCADE,
    token_konfirmasi VARCHAR(100),
    status_terkonfirmasi BOOLEAN NOT NULL DEFAULT false,
    token_unsubscribe VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pelanggan_email_wilayah UNIQUE (email, wilayah_id)
);

CREATE INDEX IF NOT EXISTS idx_pelanggan_wilayah ON pelanggan_notifikasi (wilayah_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_token_unsub ON pelanggan_notifikasi (token_unsubscribe);

-- ------------------------------------------------------------------------------
-- TABEL 9: log_notifikasi (F06, F10)
-- Audit trail pengiriman peringatan dini otomatis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_notifikasi (
    id SERIAL PRIMARY KEY,
    wilayah_id INT REFERENCES wilayah_administrasi(id) ON DELETE CASCADE,
    status_sebelumnya VARCHAR(20) NOT NULL,
    status_baru VARCHAR(20) NOT NULL,
    subjek_email VARCHAR(255) NOT NULL,
    jumlah_penerima INT NOT NULL DEFAULT 0,
    waktu_kirim TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- TABEL 10: users_admin (F10 - Panel Admin BPBD)
-- Autentikasi petugas untuk mengelola posko, air, input curah hujan, & validasi
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'petugas_bpbd' 
        CHECK (role IN ('superadmin', 'petugas_bpbd', 'operator_pdam')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Selesai
