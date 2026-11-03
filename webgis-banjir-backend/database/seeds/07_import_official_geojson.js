const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');

// Palet Warna Sesuai Foto Referensi Kota Jambi
const WARNA_KECAMATAN_MAP = {
  "danau teluk": "#f5c56c",     // Kuning Jingga
  "pelayangan": "#f29b9b",      // Merah Muda Rose
  "telanaipura": "#6cc5b3",     // Hijau Toska Teal
  "danau sipin": "#e28484",     // Salmon Pink
  "pasar jambi": "#9b8778",     // Khaki Bronze Tan
  "jambi timur": "#b6a0dc",     // Ungu Lavender
  "jelutung": "#f4a261",        // Oranye Peach
  "alam barajo": "#7fa9e8",     // Biru Muda Soft
  "kota baru": "#727885",       // Slate Grey
  "kotabaru": "#727885",
  "jambi selatan": "#7bc8a4",   // Hijau Mint
  "paal merah": "#858d99"       // Charcoal Grey
};

async function importOfficialGeoJSON() {
  const geojsonPath = path.resolve(__dirname, '../../public/geojson/kecamatan_kota_jambi2.geojson');
  if (!fs.existsSync(geojsonPath)) {
    console.error('File geojson tidak ditemukan:', geojsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(geojsonPath, 'utf8');
  const geojson = JSON.parse(raw);

  console.log(`🚀 Mengimpor ${geojson.features.length} poligon resmi kecamatan Kota Jambi...`);

  for (const feature of geojson.features) {
    const p = feature.properties;
    const geomJson = JSON.stringify(feature.geometry);
    const namaKec = p.kecamatan.trim();
    const namaKey = namaKec.toLowerCase();
    const kodeKec = p.kode_kec || '1571';
    const warna = WARNA_KECAMATAN_MAP[namaKey] || '#3b82f6';

    const sql = `
      INSERT INTO wilayah_administrasi (kode_wilayah, nama_kecamatan, nama_kelurahan, status_siaga, warna_wilayah, ambang_hujan_waspada, ambang_hujan_siaga, geom)
      VALUES (
        $1, 
        $2, 
        $3, 
        'Normal', 
        $4, 
        20.0, 
        50.0, 
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))
      )
      ON CONFLICT (kode_wilayah) DO UPDATE
      SET geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)),
          nama_kecamatan = EXCLUDED.nama_kecamatan,
          warna_wilayah = EXCLUDED.warna_wilayah;
    `;

    // Cek apakah kecamatan sudah ada dengan nama yang sama (misal 'Kotabaru' vs 'Kota Baru')
    const updateSql = `
      UPDATE wilayah_administrasi
      SET geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
          warna_wilayah = $2,
          kode_wilayah = $3,
          nama_kecamatan = $4
      WHERE LOWER(nama_kecamatan) = LOWER($4) 
         OR (LOWER($4) = 'kota baru' AND LOWER(nama_kecamatan) = 'kotabaru');
    `;

    const resUpdate = await pool.query(updateSql, [geomJson, warna, kodeKec, namaKec]);
    if (resUpdate.rowCount > 0) {
      console.log(`✅ Update poligon resmi: ${namaKec} (${kodeKec}) - Warna: ${warna}`);
    } else {
      await pool.query(sql, [kodeKec, namaKec, namaKec, warna, geomJson]);
      console.log(`➕ Insert poligon resmi baru: ${namaKec} (${kodeKec}) - Warna: ${warna}`);
    }
  }

  // Update zona rawan banjir geom jika ada agar tetap berada dalam poligon resmi
  console.log('✨ Selesai mengimpor seluruh batas wilayah resmi!');
  pool.end();
}

importOfficialGeoJSON().catch(err => {
  console.error('❌ Error import:', err);
  pool.end();
});
