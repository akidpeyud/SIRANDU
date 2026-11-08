# Data GIS Jaringan Sungai Kota Jambi

Direktori ini berisi data spasial vektor hidrografi (jaringan sungai) untuk wilayah **Kota Jambi, Provinsi Jambi**.

---

## 📁 Berkas yang Tersedia

1. **Format ESRI Shapefile (`.shp`)**:
   - `sungai_kota_jambi.shp` : Geometri garis alur sungai (PolyLine).
   - `sungai_kota_jambi.shx` : File indeks spasial.
   - `sungai_kota_jambi.dbf` : Tabel atribut tabular (dBASE III).
   - `sungai_kota_jambi.prj` : Sistem proyeksi koordinat Geografis **WGS 84 (EPSG:4326)**.
   - `sungai_kota_jambi.cpg` : Kode enkripsi karakter (UTF-8).

2. **Format GeoJSON (`.geojson`)**:
   - `sungai_kota_jambi.geojson` : Format standar terbuka berbasis JSON yang langsung kompatibel dengan QGIS, ArcGIS, Mapbox, Leaflet, dan Google Earth.

3. **Script Tambahan**:
   - `generate_gis_data.py` : Script pembangun data Shapefile & GeoJSON secara mandiri tanpa library eksternal.
   - `unduh_osm_sungai_jambi.py` : Script otomatis pengunduh live data sungai dari Overpass API OpenStreetMap.

---

## 🗺️ Cakupan Sungai Kota Jambi yang Dimasukkan

- **Sungai Batanghari (Alur Utama)**: Sungai utama yang membelah Kota Jambi dari barat (Mendalo/Danau Sipin) menuju timur laut (Gentala Arasy, Pasar Jambi, Sijenjang).
- **Sungai Batanghari (Percabangan Utara)**: Alur sisi seberang Kota Jambi (Kecamatan Pelayangan / Danau Teluk).
- **Sungai Asam**: Sistem drainase utama pengendali banjir yang melintasi Kotabaru, Jelutung, Lebak Bandung hingga Pasar Jambi.
- **Sungai Asam (Cabang Jelutung)**: Anak cabang Sungai Asam di Jelutung.
- **Sungai Maram**: Melintasi kawasan kota lama, Pasar Jambi, dan Kelenteng Hok Tek.
- **Sungai Tembuku**: Sistem kanal dan stasiun pompa banjir di Jambi Timur / Sijenjang.
- **Sungai Kenali Besar**: Mengalir dari Alam Barajo menuju Danau Sipin.
- **Sungai Kenali Kecil**: Melintasi Kenali Asam Bawah dan Paal Lima.
- **Danau Sipin (Alur Perairan)**: Danau tapal kuda (*oxbow lake*) ikonik Kota Jambi yang terhubung ke Batanghari.
- **Sungai Buluran**: Mengalir melalui Buluran Kenali ke Danau Sipin.
- **Sungai Kambang**: Melintasi Telanaipura dekat RSUD Raden Mattaher.
- **Sungai Putri**: Alur anak sungai di Kelurahan Sungai Putri, Telanaipura.
- **Sungai Legok**: Alur drainase di Kelurahan Legok.
- **Sungai Selincah**: Mengalir dari Paal Merah / Payo Selincah menuju Batanghari.
- **Sungai Lubuk Rusan**: Alur sungai di Jambi Timur dan Sijenjang.
- **Sungai Bakung**: Aliran anak sungai di kawasan Paal Merah.

---

## 📊 Skema Tabel Atribut (Standar BIG / RBI)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `ID` | Integer | Nomor identifikasi record |
| `NAMOBJ` | String (40) | Nama Objek Sungai |
| `TIPSNG` | String (20) | Tipe Sungai (Sungai Utama, Anak Sungai, Danau/Oxbow) |
| `KLSSNG` | String (15) | Klasifikasi Sungai (Ordo 1, Ordo 2, Ordo 3) |
| `FCODE` | String (10) | Kode Unsur Rupa Bumi Indonesia (BIG) |
| `PJG_KM` | Real (8,2) | Panjang alur sungai (Kilometer) |
| `REMARK` | String (80) | Keterangan wilayah lintasan dan fungsi hidrologis |
| `KAB_KOTA` | String (20) | Kota Jambi |
| `PROVINSI` | String (15) | Jambi |
| `SUMBER` | String (45) | Sumber rujukan data |

---

## 💻 Cara Menggunakan Data

### Di QGIS
1. Buka aplikasi **QGIS**.
2. Klik menu **Layer** -> **Add Layer** -> **Add Vector Layer...**
3. Browse ke file `sungai_kota_jambi.shp` atau `sungai_kota_jambi.geojson`.
4. Klik **Add**.
5. Untuk memberi label nama sungai: Klik kanan layer -> **Properties** -> **Labels** -> pilih **Single Labels** -> set *Value* ke `NAMOBJ`.

### Di ArcGIS (ArcMap / ArcGIS Pro)
1. Buka ArcMap atau ArcGIS Pro.
2. Klik tombol **Add Data** (+).
3. Arahkan ke folder `C:\Users\LENOVO\.gemini\antigravity\scratch\sungai_kota_jambi`.
4. Pilih `sungai_kota_jambi.shp` dan klik **Add**.
