-- 08_admin_enhancements.sql: Pengaturan Bobot Model AHP 6 Faktor
CREATE TABLE IF NOT EXISTS pengaturan_bobot_model (
    id SERIAL PRIMARY KEY,
    parameter VARCHAR(100) NOT NULL UNIQUE,
    nama_faktor VARCHAR(150) NOT NULL,
    bobot_persen NUMERIC(5, 2) NOT NULL,
    keterangan TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pengaturan_bobot_model (parameter, nama_faktor, bobot_persen, keterangan)
VALUES
    ('tata_guna_lahan', 'Tata Guna Lahan', 19.30, 'Kerapatan vegetasi dan tutupan permukaan resapan air'),
    ('jarak_sungai', 'Jarak dari Sungai Batanghari', 19.30, 'Buffer kedekatan sempadan sungai dan anak sungai'),
    ('elevasi_demnas', 'Ketinggian Tanah (DEMNAS)', 17.00, 'Topografi cekungan rendah berpotensi genangan'),
    ('curah_hujan', 'Intensitas Curah Hujan', 17.00, 'Data presipitasi curah hujan BMKG/Open-Meteo'),
    ('drainase', 'Kepadatan Jaringan Drainase', 14.80, 'Kapasitas dan daya tampung saluran pembuangan air'),
    ('kepadatan_permukiman', 'Kepadatan Permukiman', 12.50, 'Konsentrasi bangunan dan koefisien limpasan air')
ON CONFLICT (parameter) DO UPDATE 
SET bobot_persen = EXCLUDED.bobot_persen,
    nama_faktor = EXCLUDED.nama_faktor,
    keterangan = EXCLUDED.keterangan;
