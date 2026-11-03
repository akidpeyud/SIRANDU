-- ==============================================================================
-- SIRANDU: FASE 4 (F01 BATAS, F02 ZONA RAWAN 5 KELAS & CEK LOKASI, F03 ELEVASI DEMNAS)
-- MODEL BOBOT PROPOSAL SIRANDU:
-- 1. Tata guna lahan (19.3%)
-- 2. Jarak sungai (19.3%)
-- 3. Elevasi DEMNAS (17.0%)
-- 4. Curah hujan (17.0%)
-- 5. Drainase (14.8%)
-- 6. Kepadatan permukiman (12.5%)
-- ==============================================================================

-- 1. Pembaruan Tabel zona_rawan_banjir
ALTER TABLE zona_rawan_banjir
    ADD COLUMN IF NOT EXISTS nama_zona VARCHAR(150),
    ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100),
    ADD COLUMN IF NOT EXISTS kelas_kerawanan VARCHAR(50) DEFAULT 'Sedang', -- 'Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'
    ADD COLUMN IF NOT EXISTS tingkat_kerawanan_angka INTEGER DEFAULT 3,     -- 1 s/d 5
    ADD COLUMN IF NOT EXISTS warna_hex VARCHAR(20) DEFAULT '#f97316',
    ADD COLUMN IF NOT EXISTS skor_tata_guna_lahan NUMERIC(5, 2) DEFAULT 15.0,  -- Bobot 19.3%
    ADD COLUMN IF NOT EXISTS skor_jarak_sungai NUMERIC(5, 2) DEFAULT 15.0,      -- Bobot 19.3%
    ADD COLUMN IF NOT EXISTS skor_elevasi NUMERIC(5, 2) DEFAULT 12.0,           -- Bobot 17.0%
    ADD COLUMN IF NOT EXISTS skor_curah_hujan NUMERIC(5, 2) DEFAULT 12.0,       -- Bobot 17.0%
    ADD COLUMN IF NOT EXISTS skor_drainase NUMERIC(5, 2) DEFAULT 10.0,          -- Bobot 14.8%
    ADD COLUMN IF NOT EXISTS skor_kepadatan_permukiman NUMERIC(5, 2) DEFAULT 8.0,-- Bobot 12.5%
    ADD COLUMN IF NOT EXISTS rekomendasi_mitigasi TEXT,
    ADD COLUMN IF NOT EXISTS sumber_data VARCHAR(150) DEFAULT 'Model AHP SIG SIRANDU & Bappeda Kota Jambi',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Bersihkan data lama jika ada untuk diganti dengan poligon resmi yang komprehensif
DELETE FROM zona_rawan_banjir;

-- Seeding 5 Kelas Kerawanan Banjir untuk 11 Kecamatan di Kota Jambi berdasarkan poligon resmi
-- KELAS 5: SANGAT TINGGI (Skor > 80, #b91c1c)
INSERT INTO zona_rawan_banjir (
    wilayah_id, nama_zona, kecamatan, tingkat_rawan, kelas_kerawanan, tingkat_kerawanan_angka, warna_hex,
    skor_total, skor_tata_guna_lahan, skor_jarak_sungai, skor_elevasi, skor_curah_hujan, skor_drainase, skor_kepadatan_permukiman,
    kelas_elevasi, rata_elevasi_mdpl, faktor_penyebab_utama, rekomendasi_mitigasi, geom
)
SELECT 
    w.id, 'Zona Genangan Kritis Bantaran Danau Sipin', w.nama_kecamatan, 'Sangat Tinggi', 'Sangat Tinggi', 5, '#b91c1c',
    88.50, 18.20, 19.00, 16.50, 15.50, 11.30, 8.00,
    'Rendah', 8.5, 
    'Cekungan topografi danau alami (< 10 mdpl), kedekatan ekstrem dengan Danau Sipin & Sungai Batanghari (< 100m)',
    'Evakuasi segera ke Posko Masjid Al-Ihsan / Kantor Lurah Legok saat curah hujan > 10 mm/jam berturut-turut. Matikan aliran listrik rumah tangga.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'danau sipin'
UNION ALL
SELECT 
    w.id, 'Zona Rawan Luapan Pasang Seberang Danau Teluk', w.nama_kecamatan, 'Sangat Tinggi', 'Sangat Tinggi', 5, '#b91c1c',
    85.20, 17.50, 18.80, 16.20, 14.80, 10.40, 7.50,
    'Rendah', 9.0, 
    'Bantaran rendah Sungai Batanghari di kawasan Seberang Kota Jambi yang terendam saat air pasang',
    'Amankan barang berharga ke lantai dua rumah panggung. Koordinasikan dengan Posko Pasir Panjang jika debit air naik > 50 cm.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'danau teluk'
UNION ALL
SELECT 
    w.id, 'Zona Rawan Luapan Bantaran Pelayangan', w.nama_kecamatan, 'Sangat Tinggi', 'Sangat Tinggi', 5, '#b91c1c',
    83.80, 17.00, 18.50, 16.00, 14.80, 10.50, 7.00,
    'Rendah', 9.5, 
    'Pemukiman tepi sungai dengan pasang surut Batanghari dan keterbatasan saluran drainase primer',
    'Siapkan tas siaga bencana dan amankan lansia/anak-anak ke Posko Kantor Camat Pelayangan.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'pelayangan'
UNION ALL

-- KELAS 4: TINGGI (Skor 65 - 80, #ef4444)
SELECT 
    w.id, 'Zona Rawan Limpasan Pasar Jambi & Pertokoan', w.nama_kecamatan, 'Tinggi', 'Tinggi', 4, '#ef4444',
    76.40, 16.80, 17.20, 14.50, 13.50, 7.80, 6.60,
    'Rendah', 11.0, 
    'Kawasan hilir muara dan kepadatan bangunan tinggi yang menutup resapan tanah di sekitar Orang Kayo Hitam',
    'Pasang tanggul sementara di pintu masuk pertokoan dan hindari melintasi jalan raya depan WTC saat hujan lebat.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'pasar jambi'
UNION ALL
SELECT 
    w.id, 'Zona Backwater Kasang & Sungai Batanghari Timur', w.nama_kecamatan, 'Tinggi', 'Tinggi', 4, '#ef4444',
    74.10, 16.00, 16.50, 14.20, 13.80, 7.60, 6.00,
    'Rendah', 11.5, 
    'Efek arus balik (backwater) muara anak sungai menuju Batanghari saat puncak air pasang',
    'Pantau ketinggian pintu air Kasang dan segera aktifkan pompa air mobile BPBD.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jambi timur'
UNION ALL

-- KELAS 3: SEDANG (Skor 50 - 64.9, #f97316)
SELECT 
    w.id, 'Zona Genangan Drainase Sekunder Telanaipura', w.nama_kecamatan, 'Sedang', 'Sedang', 3, '#f97316',
    58.70, 12.50, 11.00, 11.80, 12.00, 6.20, 5.20,
    'Sedang', 15.0, 
    'Antrian aliran air di drainase Jalan RE Martadinata depan RSUD Raden Mattaher saat intensitas hujan tinggi',
    'Waspadai jalan licin dan genangan air 20-40 cm di jalan arteri Telanaipura.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'telanaipura'
UNION ALL
SELECT 
    w.id, 'Zona Cekungan Pemukiman Padat Jelutung', w.nama_kecamatan, 'Sedang', 'Sedang', 3, '#f97316',
    56.20, 11.80, 10.50, 11.50, 11.80, 5.80, 4.80,
    'Sedang', 16.5, 
    'Kepadatan perumahan Payo Lebar & Handil dengan kemiringan lereng landai',
    'Bersihkan endapan sedimen got depan rumah secara berkala sebelum musim penghujan.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jelutung'
UNION ALL
SELECT 
    w.id, 'Zona Saluran Limpasan Perumahan Baru Alam Barajo', w.nama_kecamatan, 'Sedang', 'Sedang', 3, '#f97316',
    53.80, 11.00, 9.80, 11.00, 11.50, 5.70, 4.80,
    'Sedang', 18.0, 
    'Alih fungsi lahan menjadi perumahan di Bagan Pete & Kenali Besar tanpa retensi air yang memadai',
    'Hubungi Call Center BPBD Jambi jika saluran pembuangan utama perumahan tersumbat.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'alam barajo'
UNION ALL

-- KELAS 2: RENDAH (Skor 35 - 49.9, #eab308)
SELECT 
    w.id, 'Zona Dataran Terkendali Jambi Selatan', w.nama_kecamatan, 'Rendah', 'Rendah', 2, '#eab308',
    44.60, 9.50, 7.80, 9.20, 10.00, 4.50, 3.60,
    'Sedang', 20.0, 
    'Topografi sedang (18-22 mdpl) dengan jaringan drainase primer Thehok yang cukup lancar',
    'Kondisi relatif aman dari luapan sungai besar, waspadai genangan sesaat pada cekungan jalan lokal.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jambi selatan'
UNION ALL
SELECT 
    w.id, 'Zona Bergelombang Bandara Paal Merah', w.nama_kecamatan, 'Rendah', 'Rendah', 2, '#eab308',
    41.50, 8.80, 6.50, 8.80, 9.80, 4.20, 3.40,
    'Sedang', 22.0, 
    'Jarak cukup jauh dari Sungai Batanghari (> 2 km) dan memiliki tanah serapan pasir/lempung',
    'Kondisi aman, pantau kelancaran saluran pembuangan menuju rawa pinggiran.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'paal merah'
UNION ALL

-- KELAS 1: SANGAT RENDAH (Skor < 35, #22c55e)
SELECT 
    w.id, 'Zona Dataran Tinggi Bebas Banjir Kota Baru', w.nama_kecamatan, 'Sangat Rendah', 'Sangat Rendah', 1, '#22c55e',
    28.20, 5.50, 3.20, 6.50, 8.00, 2.80, 2.20,
    'Tinggi', 28.5, 
    'Topografi perbukitan alami Kota Baru (> 25 mdpl) dengan kapasitas infiltrasi air sangat baik',
    'Zona Sangat Aman. Sangat direkomendasikan sebagai lokasi evakuasi induk dan penampungan pengungsi kota.',
    w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'kotabaru' OR LOWER(w.nama_kecamatan) = 'kota baru';

-- 2. Pembuatan Tabel klasifikasi_elevasi (F03 DEMNAS)
CREATE TABLE IF NOT EXISTS klasifikasi_elevasi (
    id SERIAL PRIMARY KEY,
    wilayah_id INTEGER REFERENCES wilayah_administrasi(id) ON DELETE CASCADE,
    nama_wilayah VARCHAR(100) NOT NULL,
    kecamatan VARCHAR(100) NOT NULL,
    kelas_elevasi VARCHAR(50) NOT NULL, -- 'Rendah', 'Sedang', 'Tinggi'
    rentang_mdpl VARCHAR(50) NOT NULL,
    rata_elevasi_mdpl NUMERIC(5, 1) NOT NULL,
    warna_hex VARCHAR(20) NOT NULL,
    deskripsi_topografi TEXT NOT NULL,
    rekomendasi_tata_ruang TEXT NOT NULL,
    sumber_data VARCHAR(150) DEFAULT 'DEMNAS Badan Informasi Geospasial (Resolusi 0.27 arc-sec / 8m)',
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_klasifikasi_elevasi_geom ON klasifikasi_elevasi USING GIST(geom);

DELETE FROM klasifikasi_elevasi;

-- Seeding Kelas Elevasi DEMNAS per Wilayah Kecamatan Kota Jambi:
-- KELAS RENDAH (< 12 mdpl)
INSERT INTO klasifikasi_elevasi (wilayah_id, nama_wilayah, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl, warna_hex, deskripsi_topografi, rekomendasi_tata_ruang, geom)
SELECT 
    w.id, 'Cekungan Danau Sipin', w.nama_kecamatan, 'Rendah', '< 12 mdpl', 8.5, '#ef4444',
    'Cekungan aluvial danau alami dan bantaran Sungai Batanghari. Sangat rawan genangan air.',
    'Kawasan konservasi dan tandon air alami kota Jambi.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'danau sipin'
UNION ALL
SELECT 
    w.id, 'Bantaran Rendah Danau Teluk', w.nama_kecamatan, 'Rendah', '< 12 mdpl', 9.0, '#ef4444',
    'Bantaran rendah seberang Sungai Batanghari yang terpengaruh pasang surut air laut.',
    'Pemukiman panggung adaptif banjir dan sempadan sungai.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'danau teluk'
UNION ALL
SELECT 
    w.id, 'Bantaran Rendah Pelayangan', w.nama_kecamatan, 'Rendah', '< 12 mdpl', 9.5, '#ef4444',
    'Dataran banjir alami seberang Kota Jambi dengan sistem drainase alami.',
    'Penguatan tanggul alami dan rumah panggung tradisional.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'pelayangan'
UNION ALL
SELECT 
    w.id, 'Kawasan Hilir Pasar Jambi', w.nama_kecamatan, 'Rendah', '< 12 mdpl', 11.0, '#ef4444',
    'Dataran tepi sungai muara dengan kepadatan bangunan perdagangan.',
    'Pintu air otomatis dan sistem pompa drainase perkotaan.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'pasar jambi'
UNION ALL
SELECT 
    w.id, 'Kawasan Muara Jambi Timur', w.nama_kecamatan, 'Rendah', '< 12 mdpl', 11.5, '#ef4444',
    'Dataran rendah di pertemuan muara anak sungai Batanghari.',
    'Normalisasi saluran pembuangan utama Kasang.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jambi timur'
UNION ALL

-- KELAS SEDANG (12 - 25 mdpl)
SELECT 
    w.id, 'Dataran Sedang Telanaipura', w.nama_kecamatan, 'Sedang', '12 - 25 mdpl', 15.0, '#f59e0b',
    'Dataran sedang landai tempat perkantoran pemerintah dan fasilitas kesehatan.',
    'Pemeliharaan saluran drainase sekunder Jalan RE Martadinata.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'telanaipura'
UNION ALL
SELECT 
    w.id, 'Dataran Pemukiman Jelutung', w.nama_kecamatan, 'Sedang', '12 - 25 mdpl', 16.5, '#f59e0b',
    'Pemukiman padat penduduk dengan topografi bergelombang lemah.',
    'Pembangunan kolam retensi komunal dan pembersihan got.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jelutung'
UNION ALL
SELECT 
    w.id, 'Dataran Sedang Alam Barajo', w.nama_kecamatan, 'Sedang', '12 - 25 mdpl', 18.0, '#f59e0b',
    'Kawasan pengembangan perumahan baru dengan tanah liat berpasir.',
    'Kewajiban penyediaan fasilitas kolam resapan air bagi developer perumahan.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'alam barajo'
UNION ALL
SELECT 
    w.id, 'Dataran Sedang Jambi Selatan', w.nama_kecamatan, 'Sedang', '12 - 25 mdpl', 20.0, '#f59e0b',
    'Dataran stabil dengan jaringan drainase primer yang lancar.',
    'Kawasan pemukiman dan perdagangan terkendali.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'jambi selatan'
UNION ALL
SELECT 
    w.id, 'Dataran Bergelombang Paal Merah', w.nama_kecamatan, 'Sedang', '12 - 25 mdpl', 22.0, '#f59e0b',
    'Kawasan sekitar bandara dengan infiltrasi tanah yang cukup baik.',
    'Pengendalian sempadan rawa dan perlindungan zona resapan air.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'paal merah'
UNION ALL

-- KELAS TINGGI (> 25 mdpl)
SELECT 
    w.id, 'Punggung Bukit Kota Baru', w.nama_kecamatan, 'Tinggi', '> 25 mdpl', 28.5, '#10b981',
    'Topografi perbukitan alami Kota Baru dengan elevasi tertinggi di Kota Jambi. Bebas dari banjir.',
    'Lokasi strategis untuk fasilitas publik vital dan posko evakuasi induk pengungsian banjir.', w.geom
FROM wilayah_administrasi w WHERE LOWER(w.nama_kecamatan) = 'kotabaru' OR LOWER(w.nama_kecamatan) = 'kota baru';
