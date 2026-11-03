-- ==============================================================================
-- UPDATE GEOMETRI BATAS ADMINISTRASI 11 KECAMATAN KOTA JAMBI SESUAI PETA
-- Membentuk poligon kontigu (saling menyambung) dengan garis batas putih & warna khas
-- ==============================================================================

-- Pastikan kolom warna ada di tabel wilayah_administrasi
ALTER TABLE wilayah_administrasi ADD COLUMN IF NOT EXISTS warna_wilayah VARCHAR(20) DEFAULT '#3b82f6';

-- 1. Danau Teluk (Kuning Jingga / Mustard - Utara Sungai Batanghari Barat)
UPDATE wilayah_administrasi
SET warna_wilayah = '#f5c56c',
    nama_kelurahan = 'Pasir Panjang & Danau Teluk',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.555 -1.582,
      103.570 -1.560,
      103.600 -1.545,
      103.605 -1.570,
      103.585 -1.585,
      103.565 -1.588,
      103.555 -1.582
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'danau teluk';

-- 2. Pelayangan (Merah Muda / Rose Pink - Utara Sungai Batanghari Timur)
UPDATE wilayah_administrasi
SET warna_wilayah = '#f29b9b',
    nama_kelurahan = 'Arab Melayu & Tahtul Yaman',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.605 -1.570,
      103.600 -1.545,
      103.635 -1.548,
      103.645 -1.570,
      103.620 -1.582,
      103.605 -1.570
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'pelayangan';

-- 3. Telanaipura (Hijau Toska / Teal - Barat Laut: Buluran Kenali, Penyengat Rendah)
UPDATE wilayah_administrasi
SET warna_wilayah = '#6cc5b3',
    nama_kelurahan = 'Buluran Kenali & Penyengat Rendah',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.540 -1.615,
      103.535 -1.590,
      103.555 -1.582,
      103.585 -1.585,
      103.582 -1.605,
      103.570 -1.620,
      103.540 -1.615
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'telanaipura';

-- 4. Danau Sipin (Salmon Pink - Tengah Tepi Sungai: Legok, Solok Sipin)
UPDATE wilayah_administrasi
SET warna_wilayah = '#e28484',
    nama_kelurahan = 'Legok & Danau Sipin',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.582 -1.605,
      103.585 -1.585,
      103.610 -1.585,
      103.608 -1.608,
      103.595 -1.612,
      103.582 -1.605
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'danau sipin';

-- 5. Pasar Jambi (Khaki Bronze - Pusat Kota Tepi Sungai: Orang Kayo Hitam)
UPDATE wilayah_administrasi
SET warna_wilayah = '#9b8778',
    nama_kelurahan = 'Orang Kayo Hitam & Pasar',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.610 -1.585,
      103.625 -1.585,
      103.622 -1.600,
      103.608 -1.600,
      103.610 -1.585
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'pasar jambi';

-- 6. Jambi Timur (Ungu Lavender - Timur Laut: Tanjung Pinang, Kasang, Rajawali)
UPDATE wilayah_administrasi
SET warna_wilayah = '#b6a0dc',
    nama_kelurahan = 'Kasang & Rajawali',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.625 -1.585,
      103.645 -1.570,
      103.660 -1.590,
      103.648 -1.618,
      103.622 -1.610,
      103.622 -1.600,
      103.625 -1.585
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'jambi timur';

-- 7. Jelutung (Oranye Peach - Tengah: Payo Lebar, Cempaka Putih, Handil)
UPDATE wilayah_administrasi
SET warna_wilayah = '#f4a261',
    nama_kelurahan = 'Payo Lebar & Kebun Handil',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.595 -1.612,
      103.608 -1.608,
      103.622 -1.600,
      103.622 -1.625,
      103.605 -1.632,
      103.595 -1.612
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'jelutung';

-- 8. Alam Barajo (Soft Blue - Barat Daya: Bagan Pete, Kenali Besar, Beliung)
UPDATE wilayah_administrasi
SET warna_wilayah = '#7fa9e8',
    nama_kelurahan = 'Kenali Besar & Bagan Pete',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.515 -1.665,
      103.540 -1.615,
      103.570 -1.620,
      103.585 -1.635,
      103.580 -1.670,
      103.515 -1.665
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'alam barajo';

-- 9. Kota Baru (Dark Slate Grey - Selatan Tengah: Paal Lima, Kenali Asam Bawah, Talang Gulo)
UPDATE wilayah_administrasi
SET warna_wilayah = '#727885',
    nama_kelurahan = 'Kenali Asam Bawah & Paal Lima',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.585 -1.635,
      103.595 -1.612,
      103.605 -1.632,
      103.620 -1.635,
      103.635 -1.675,
      103.615 -1.688,
      103.580 -1.670,
      103.585 -1.635
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'kotabaru' OR LOWER(nama_kecamatan) = 'kota baru';

-- 10. Jambi Selatan (Mint Green - Tenggara Tengah: Wijaya Pura, Thehok)
UPDATE wilayah_administrasi
SET warna_wilayah = '#7bc8a4',
    nama_kelurahan = 'Wijaya Pura & Thehok',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.622 -1.610,
      103.640 -1.615,
      103.642 -1.645,
      103.620 -1.635,
      103.622 -1.625,
      103.622 -1.610
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'jambi selatan';

-- 11. Paal Merah (Slate Charcoal - Tenggara: Talang Bakung, Lingkar Selatan, Eka Jaya)
UPDATE wilayah_administrasi
SET warna_wilayah = '#858d99',
    nama_kelurahan = 'Talang Bakung & Lingkar Selatan',
    geom = ST_Multi(ST_GeomFromText('POLYGON((
      103.648 -1.618,
      103.660 -1.590,
      103.690 -1.625,
      103.670 -1.675,
      103.642 -1.645,
      103.640 -1.615,
      103.648 -1.618
    ))', 4326))
WHERE LOWER(nama_kecamatan) = 'paal merah';
