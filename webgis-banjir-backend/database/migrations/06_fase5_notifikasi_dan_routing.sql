-- ==============================================================================
-- SIRANDU: FASE 5 (F06 NOTIFIKASI EMAIL & F09 NAVIGASI JALUR EVAKUASI PEKA RISIKO)
-- ==============================================================================

-- 1. Penyesuaian Tabel pelanggan_notifikasi (F06)
ALTER TABLE pelanggan_notifikasi
    ADD COLUMN IF NOT EXISTS id_kecamatan INTEGER REFERENCES kecamatan(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS token_verifikasi VARCHAR(100);

-- Sinkronisasi kolom lama dengan kolom baru
UPDATE pelanggan_notifikasi
SET id_kecamatan = COALESCE(id_kecamatan, wilayah_id),
    is_verified = COALESCE(is_verified, status_terkonfirmasi),
    token_verifikasi = COALESCE(token_verifikasi, token_konfirmasi);

-- 2. Penyesuaian Tabel log_notifikasi (F06)
ALTER TABLE log_notifikasi
    ADD COLUMN IF NOT EXISTS id_kecamatan INTEGER REFERENCES kecamatan(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS waktu TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS jumlah_terkirim INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status_pengiriman VARCHAR(50) DEFAULT 'Sukses';

UPDATE log_notifikasi
SET id_kecamatan = COALESCE(id_kecamatan, wilayah_id),
    waktu = COALESCE(waktu, waktu_kirim),
    jumlah_terkirim = COALESCE(jumlah_terkirim, jumlah_penerima);

-- 3. View / Tabel Kompatibilitas pgRouting: jaringan_jalan
CREATE OR REPLACE VIEW jaringan_jalan AS
SELECT 
    id,
    source,
    target,
    panjang_meter AS length_m,
    cost,
    reverse_cost,
    geom
FROM jaringan_jalan_evakuasi;

-- Pastikan ekstensi pgrouting aktif
CREATE EXTENSION IF NOT EXISTS pgrouting;
