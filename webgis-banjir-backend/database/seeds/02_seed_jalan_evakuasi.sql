-- Seed Jaringan Jalan Evakuasi (Topologi pgRouting) di Kota Jambi
INSERT INTO jaringan_jalan_evakuasi (osm_id, nama_jalan, tipe_jalan, panjang_meter, source, target, cost, reverse_cost, tergenang, tinggi_genangan_cm, faktor_penalti, geom)
VALUES
-- Segmen 1: Titik Pasir Panjang ke Simpang Utama (Node 1 -> Node 2)
(1001, 'Jl. KH. Hasan Anang', 'secondary', 250.0, 1, 2, 250.0, 250.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.5850 -1.5930, 103.5870 -1.5940)', 4326)),

-- Segmen 2: Simpang Pasir Panjang ke Posko Camat Danau Teluk (Node 2 -> Node 3)
(1002, 'Jl. Lintas Danau Teluk', 'tertiary', 120.0, 2, 3, 120.0, 120.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.5870 -1.5940, 103.5860 -1.5930)', 4326)),

-- Segmen 3: Simpang Pasir Panjang ke Arah Jembatan Aur Duri 1 (Node 2 -> Node 4)
(1003, 'Jl. Sersan Muslim (Arah Aur Duri)', 'primary', 1500.0, 2, 4, 1500.0, 1500.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.5870 -1.5940, 103.5920 -1.6020)', 4326)),

-- Segmen 4: Aur Duri ke Telanaipura (Node 4 -> Node 5)
(1004, 'Jl. Kolonel Abunjani', 'primary', 1800.0, 4, 5, 1800.0, 1800.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.5920 -1.6020, 103.6015 -1.6080)', 4326)),

-- Segmen 5: Telanaipura ke Simpang BI (Node 5 -> Node 6)
(1005, 'Jl. Jenderal A. Yani', 'primary', 900.0, 5, 6, 900.0, 900.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.6015 -1.6080, 103.6080 -1.6180)', 4326)),

-- Segmen 6: Simpang BI ke Kotabaru / Posko Utama BPBD (Node 6 -> Node 7)
(1006, 'Jl. H. Agus Salim (Arah GOR & BPBD)', 'primary', 3200.0, 6, 7, 3200.0, 3200.0, false, 0.0, 1.0,
 ST_GeomFromText('LINESTRING(103.6080 -1.6180, 103.6120 -1.6480)', 4326)),

-- Segmen 7: Ruas Rawan Banjir Alternatif (Bantaran Sungai - Node 2 -> Node 8)
(1007, 'Jl. Pinggiran Batanghari (Bantaran)', 'residential', 800.0, 2, 8, 800.0, 800.0, true, 45.0, 5.0,
 ST_GeomFromText('LINESTRING(103.5870 -1.5940, 103.5980 -1.5910)', 4326)),

-- Segmen 8: Bantaran ke Simpang Kasang (Node 8 -> Node 9)
(1008, 'Jl. Kasang Bahari (Genangan Tinggi)', 'residential', 1100.0, 8, 9, 1100.0, 1100.0, true, 60.0, 10.0,
 ST_GeomFromText('LINESTRING(103.5980 -1.5910, 103.6300 -1.6150)', 4326));
