/**
 * Mengekspor data sungai dan zona buffer dari database SIRANDU menjadi berkas JavaScript
 * (gaya river.js: `var DATA_RIVER = { ...GeoJSON... };`) yang bisa dipakai peta offline.
 *
 * Pakai:   npm run db:export-sungai
 *          npm run db:export-sungai -- ../folder/tujuan     (folder lain, opsional)
 * Hasil :  sungai_kota_jambi/data/river.js   -> var DATA_RIVER  (garis sungai)
 *          sungai_kota_jambi/data/buffer_sungai.js -> var DATA_BUFFER (zona rawan 150 / 400 / 800 m)
 *
 * Jarak buffer sama dengan yang dipakai API (src/controllers/petaController.js).
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

const headerRiver = (n) => `/* =========================================================
   DATA SUNGAI KOTA JAMBI — LOKAL, OFFLINE
   =========================================================
   Diekspor dari database SIRANDU (tabel sungai_kota_jambi) pada ${tanggal}.
   Isi    : ${n} garis sungai (LineString), sudah dipotong ke area Kota Jambi
            dengan margin 500 m.
   Sumber : © OpenStreetMap contributors (lisensi ODbL).
            Atribusi ini wajib dicantumkan bila data dipublikasikan.

   Properti tiap fitur:
     name        nama sungai (bila tidak bernama: "Aliran tanpa nama (OSM ...)")
     tipe        "Sungai Utama" (Batanghari) | "Anak Sungai" | "Saluran / Drainase"
     lebar_meter perkiraan lebar rata-rata sungai (meter)
     source      sumber data

   CARA PAKAI di HTML (tanpa request jaringan, tanpa fetch):
     <script src="data/river.js"></script>
     <script> L.geoJSON(DATA_RIVER, { style: { color: "#0284c7", weight: 3 } }).addTo(map); </script>

   Buat ulang berkas ini setelah data sungai di database berubah:
     cd webgis-banjir-backend && npm run db:export-sungai
   ========================================================= */
`

const headerBuffer = (n) => `/* =========================================================
   DATA BUFFER SUNGAI (DAERAH RAWAN TEPI SUNGAI) — LOKAL, OFFLINE
   =========================================================
   Diekspor dari database SIRANDU pada ${tanggal}.
   Isi    : ${n} poligon zona rawan di sisi kiri dan kanan Sungai Batanghari
            (tipe "Sungai Utama"), dihitung dengan PostGIS ST_Buffer pada
            geography (jarak dalam meter, bukan derajat).
   Urutan : dari zona terluar ke terdalam, agar digambar bertumpuk dengan benar.

     jarak_meter   tingkat_bahaya   keterangan
     800           Waspada          Waspada genangan pasang
     400           Siaga            Siaga luapan Batanghari
     150           Bahaya           Bahaya ekstrem bantaran sungai

   Properti tiap fitur: zona_buffer, jarak_meter, tingkat_bahaya, warna, fill_opacity.
   Sumber garis sungai: © OpenStreetMap contributors (lisensi ODbL).

   CARA PAKAI di HTML (tanpa request jaringan, tanpa fetch):
     <script src="data/buffer_sungai.js"></script>
     <script>
       L.geoJSON(DATA_BUFFER, {
         style: (f) => ({ color: f.properties.warna, weight: 1, fillColor: f.properties.warna,
                          fillOpacity: f.properties.fill_opacity })
       }).addTo(map);
     </script>

   Buat ulang berkas ini setelah data sungai di database berubah:
     cd webgis-banjir-backend && npm run db:export-sungai
   ========================================================= */
`

;(async () => {
  try {
    const sungai = await pool.query(`
      SELECT id, nama_sungai, tipe, lebar_rata_rata_meter, ST_AsGeoJSON(geom, 7)::json AS geometry
      FROM sungai_kota_jambi
      ORDER BY (tipe = 'Sungai Utama') ASC, nama_sungai, id`)
    const river = {
      type: 'FeatureCollection',
      features: sungai.rows.map((r) => ({
        type: 'Feature',
        properties: { name: r.nama_sungai, tipe: r.tipe, lebar_meter: Number(r.lebar_rata_rata_meter), source: 'OpenStreetMap contributors' },
        geometry: r.geometry,
        id: 'sungai/' + r.id,
      })),
    }

    const buf = await pool.query(`
      WITH utama AS (SELECT ST_Union(geom) AS geom FROM sungai_kota_jambi WHERE tipe = 'Sungai Utama')
      SELECT zona_label, radius_meter, tingkat_bahaya, warna, fill_opacity, ST_AsGeoJSON(ST_Buffer(geom::geography, radius_meter)::geometry, 6)::json AS geometry
      FROM utama, (VALUES
        (800, 'Radius 800m (Waspada Genangan Pasang)',        'Waspada', '#eab308', 0.20),
        (400, 'Radius 400m (Siaga Luapan Batanghari)',        'Siaga',   '#ea580c', 0.35),
        (150, 'Radius 150m (Bahaya Ekstrem Bantaran Sungai)', 'Bahaya',  '#dc2626', 0.50)
      ) AS z(radius_meter, zona_label, tingkat_bahaya, warna, fill_opacity)
      ORDER BY radius_meter DESC`)
    const buffer = {
      type: 'FeatureCollection',
      features: buf.rows.map((r) => ({
        type: 'Feature',
        properties: { zona_buffer: r.zona_label, jarak_meter: r.radius_meter, tingkat_bahaya: r.tingkat_bahaya, warna: r.warna, fill_opacity: Number(r.fill_opacity) },
        geometry: r.geometry,
        id: 'buffer/' + r.radius_meter,
      })),
    }
    if (!river.features.length) throw new Error('Tabel sungai_kota_jambi kosong, tidak ada yang diekspor.')
    if (!buffer.features.length) throw new Error("Tidak ada sungai bertipe 'Sungai Utama', buffer tidak bisa dibuat.")

    fs.mkdirSync(outDir, { recursive: true })
    const f1 = path.join(outDir, 'river.js'), f2 = path.join(outDir, 'buffer_sungai.js')
    fs.writeFileSync(f1, headerRiver(river.features.length) + 'var DATA_RIVER = ' + ser(river) + ';\n', 'utf8')
    fs.writeFileSync(f2, headerBuffer(buffer.features.length) + 'var DATA_BUFFER = ' + ser(buffer) + ';\n', 'utf8')
    const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB'
    console.log(`✅ ${f1}  (${river.features.length} sungai, ${kb(f1)})`)
    console.log(`✅ ${f2}  (${buffer.features.length} zona buffer, ${kb(f2)})`)
  } catch (e) { console.error('❌ Ekspor gagal:', e.message); process.exitCode = 1 } finally { await pool.end() }
})()
