/**
 * Mengekspor layer ketinggian tanah (tabel klasifikasi_elevasi) menjadi berkas JavaScript
 * gaya river.js: `var DATA_ELEVASI = { ...GeoJSON... };` untuk peta offline.
 *
 * Pakai:   npm run db:export-elevasi
 *          npm run db:export-elevasi -- ../folder/tujuan     (folder lain, opsional)
 * Hasil :  sungai_kota_jambi/data/elevasi_tanah.js -> var DATA_ELEVASI (poligon 3 kelas ketinggian)
 *          database/seeds/08_seed_klasifikasi_elevasi.sql  -> seed untuk `npm run db:setup` (seluruh tim)
 *
 * Syarat: tabel klasifikasi_elevasi sudah terisi (hasil olahan DEM). Bila kosong, skrip berhenti.
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg')

const outDir = path.resolve(process.argv[2] || path.join(__dirname, '../../sungai_kota_jambi/data'))
const pool = new Pool({
  user: process.env.DB_USER || 'postgres', host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'db_banjir', password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
})

// Serializer gaya JS (kunci tanpa tanda kutip, pasangan koordinat satu baris, koma di ujung).
const ID = /^[A-Za-z_$][\w$]*$/
function ser(v, depth = 0) {
  const pad = '  '.repeat(depth), pad1 = '  '.repeat(depth + 1)
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) {
    if (!v.length) return '[]'
    if (v.every((x) => typeof x === 'number')) return '[' + v.join(', ') + ']'
    return '[\n' + v.map((x) => pad1 + ser(x, depth + 1) + ',').join('\n') + '\n' + pad + ']'
  }
  return '{\n' + Object.keys(v).map((k) => pad1 + (ID.test(k) ? k : JSON.stringify(k)) + ': ' + ser(v[k], depth + 1) + ',').join('\n') + '\n' + pad + '}'
}

const tanggal = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })

const header = (n) => `/* =========================================================
   DATA KETINGGIAN TANAH KOTA JAMBI — LOKAL, OFFLINE
   =========================================================
   Diekspor dari database SIRANDU (tabel klasifikasi_elevasi) pada ${tanggal}.
   Isi    : ${n} poligon (MultiPolygon), satu per kombinasi kecamatan dan kelas ketinggian.
   Sumber : Copernicus DEM GLO-30 (ESA / Uni Eropa), resolusi ± 30 m, model permukaan
            (pohon dan bangunan ikut terukur). Diolah SIRANDU: dihaluskan ± 150 m,
            dibagi 3 kelas, dipotong per kecamatan, serpihan < 5.000 m² dibuang.
            Periksa ketentuan atribusi resmi Copernicus sebelum data dipublikasikan.
   Catatan: ini perkiraan dari satelit, bukan hasil survei. Untuk ketelitian lebih baik
            gunakan DEMNAS (BIG, 8 m).

   Kelas (batas sama dengan perhitungan risiko di backend):
     Rendah   < 12 mdpl     cekungan, rentan genangan dan luapan sungai
     Sedang   12 - 25 mdpl  permukiman, genangan setempat saat hujan lebat
     Tinggi   > 25 mdpl     relatif aman dari luapan sungai

   Properti tiap fitur:
     name, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl (mdpl), warna_hex,
     deskripsi_topografi, rekomendasi_tata_ruang, sumber_data

   CARA PAKAI di HTML (tanpa request jaringan, tanpa fetch):
     <script src="data/elevasi_tanah.js"></script>
     <script>
       L.geoJSON(DATA_ELEVASI, {
         style: (f) => ({ color: "#ffffff", weight: 0.5, fillColor: f.properties.warna_hex, fillOpacity: 0.45 })
       }).addTo(map);
     </script>

   Buat ulang berkas ini setelah tabel klasifikasi_elevasi berubah:
     cd webgis-banjir-backend && npm run db:export-elevasi
   ========================================================= */
`

;(async () => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nama_wilayah, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl, warna_hex,
             deskripsi_topografi, rekomendasi_tata_ruang, sumber_data, ST_AsGeoJSON(geom, 6)::json AS geometry
      FROM klasifikasi_elevasi
      ORDER BY CASE kelas_elevasi WHEN 'Rendah' THEN 1 WHEN 'Sedang' THEN 2 ELSE 3 END, kecamatan, id`)
    if (!rows.length) throw new Error('Tabel klasifikasi_elevasi kosong. Isi dulu dari DEM, baru diekspor.')
    const data = {
      type: 'FeatureCollection',
      features: rows.map((r) => ({
        type: 'Feature',
        properties: {
          name: r.nama_wilayah, kecamatan: r.kecamatan, kelas_elevasi: r.kelas_elevasi, rentang_mdpl: r.rentang_mdpl,
          rata_elevasi_mdpl: Number(r.rata_elevasi_mdpl), warna_hex: r.warna_hex,
          deskripsi_topografi: r.deskripsi_topografi, rekomendasi_tata_ruang: r.rekomendasi_tata_ruang, sumber_data: r.sumber_data,
        },
        geometry: r.geometry,
        id: 'elevasi/' + r.id,
      })),
    }
    fs.mkdirSync(outDir, { recursive: true })
    const f = path.join(outDir, 'elevasi_tanah.js')
    fs.writeFileSync(f, header(data.features.length) + 'var DATA_ELEVASI = ' + ser(data) + ';\n', 'utf8')
    console.log(`✅ ${f}  (${data.features.length} poligon, ${(fs.statSync(f).size / 1024).toFixed(0)} KB)`)

    // Berkas seed: dijalankan otomatis oleh `npm run db:setup` agar semua anggota tim mendapat data yang sama.
    const q = (s) => "'" + String(s ?? '').replace(/'/g, "''") + "'"
    const slug = (s) => String(s).toLowerCase().replace(/\s+/g, '')
    const values = rows.map((r) =>
      `  ((SELECT w.id FROM wilayah_administrasi w WHERE REPLACE(LOWER(w.nama_kecamatan), ' ', '') = ${q(slug(r.kecamatan))} LIMIT 1),\n` +
      `   ${q(r.nama_wilayah)}, ${q(r.kecamatan)}, ${q(r.kelas_elevasi)}, ${q(r.rentang_mdpl)}, ${Number(r.rata_elevasi_mdpl)}, ${q(r.warna_hex)},\n` +
      `   ${q(r.deskripsi_topografi)},\n   ${q(r.rekomendasi_tata_ruang)},\n   ${q(r.sumber_data)},\n` +
      `   ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${q(JSON.stringify(r.geometry))}), 4326)))`
    ).join(',\n')
    const seed = `-- =========================================================
-- Seed ketinggian tanah Kota Jambi (${rows.length} poligon, 3 kelas: Rendah < 12, Sedang 12-25, Tinggi > 25 mdpl)
-- Dibuat otomatis oleh: npm run db:export-elevasi   (jangan diedit tangan; ubah datanya lalu ekspor ulang)
-- Sumber : Copernicus DEM GLO-30 (ESA / Uni Eropa), resolusi +-30 m, model permukaan, diolah SIRANDU.
--          Perkiraan dari satelit, bukan survei. Cara pengolahan: database/dem/bangun_elevasi_dari_dem.sql
-- Urutan : berjalan setelah seed wilayah (01-06). wilayah_id dicocokkan lewat nama kecamatan
--          (tanpa spasi, huruf kecil) karena 07_import_official_geojson.js mengganti nama setelahnya
--          (mis. Kotabaru -> Kota Baru); id wilayah tidak berubah. Bila tidak cocok, wilayah_id = NULL.
-- Aman dijalankan ulang: isi lama klasifikasi_elevasi diganti seluruhnya.
-- =========================================================
DELETE FROM klasifikasi_elevasi;
INSERT INTO klasifikasi_elevasi
  (wilayah_id, nama_wilayah, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl, warna_hex,
   deskripsi_topografi, rekomendasi_tata_ruang, sumber_data, geom)
VALUES
${values};
`
    const seedFile = path.resolve(__dirname, '../database/seeds/08_seed_klasifikasi_elevasi.sql')
    fs.writeFileSync(seedFile, seed, 'utf8')
    console.log(`✅ ${seedFile}  (${rows.length} baris, ${(fs.statSync(seedFile).size / 1024).toFixed(0)} KB)`)
  } catch (e) { console.error('❌ Ekspor gagal:', e.message); process.exitCode = 1 } finally { await pool.end() }
})()
