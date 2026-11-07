/**
 * Impor titik banjir historis dari file GeoJSON (Point) atau CSV ke tabel titik_banjir_historis.
 *
 *   npm run db:import-banjir -- path/ke/data.geojson
 *   npm run db:import-banjir -- path/ke/data.csv
 *   tambahkan --dry untuk uji coba tanpa menyimpan.
 *
 * Kolom/properti yang dibaca (nama lain diabaikan):
 *   nama_lokasi*, tinggi_genangan_cm*, tanggal_kejadian (YYYY-MM-DD), tahun_kejadian,
 *   lama_genangan_jam, keterangan, kecamatan, lat & lng (khusus CSV; GeoJSON memakai geometri).
 *   (* wajib)
 * Kecamatan/wilayah diisi otomatis dari lokasi titik bila belum ada. Titik yang sudah ada
 * (nama_lokasi + tanggal_kejadian sama) dilewati, sehingga aman dijalankan berulang.
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg')

const args = process.argv.slice(2), dry = args.includes('--dry'), file = args.find((a) => !a.startsWith('--'))
if (!file) { console.error('Pemakaian: npm run db:import-banjir -- <file.geojson|file.csv> [--dry]'); process.exit(1) }

function parseCsv(text) {
  const rows = []; let cur = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',' || c === ';') { cur.push(f); f = '' }
    else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || cur.length) { cur.push(f); rows.push(cur) }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim() !== ''))
  const keys = head.map((h) => h.trim().toLowerCase())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

function load(fp) {
  const raw = fs.readFileSync(fp, 'utf8').replace(/^﻿/, '')
  if (/\.csv$/i.test(fp)) return parseCsv(raw).map((r) => ({ ...r, lat: parseFloat(r.lat ?? r.latitude), lng: parseFloat(r.lng ?? r.lon ?? r.longitude) }))
  const g = JSON.parse(raw), fs_ = g.type === 'FeatureCollection' ? g.features : [g]
  return fs_.filter((f) => f.geometry?.type === 'Point').map((f) => ({ ...f.properties, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }))
}

;(async () => {
  const pool = new Pool({ user: process.env.DB_USER || 'postgres', host: process.env.DB_HOST || 'localhost', database: process.env.DB_NAME || 'db_banjir', password: String(process.env.DB_PASSWORD || ''), port: parseInt(process.env.DB_PORT, 10) || 5432 })
  const items = load(path.resolve(file)); let ok = 0, skip = 0; const bad = []
  try {
    for (const [i, r] of items.entries()) {
      const tinggi = parseInt(r.tinggi_genangan_cm, 10), nama = (r.nama_lokasi || '').trim()
      if (!nama || !Number.isFinite(tinggi) || !Number.isFinite(r.lat) || !Number.isFinite(r.lng) || Math.abs(r.lat) > 90 || Math.abs(r.lng) > 180) { bad.push(`baris ${i + 1}: data wajib kurang/tidak valid`); continue }
      const tgl = /^\d{4}-\d{2}-\d{2}$/.test(r.tanggal_kejadian || '') ? r.tanggal_kejadian : null
      const tahun = parseInt(r.tahun_kejadian, 10) || (tgl ? +tgl.slice(0, 4) : new Date().getFullYear())
      const dup = await pool.query('SELECT 1 FROM titik_banjir_historis WHERE nama_lokasi=$1 AND tanggal_kejadian IS NOT DISTINCT FROM $2::date', [nama, tgl])
      if (dup.rowCount) { skip++; continue }
      if (dry) { ok++; continue }
      await pool.query(`INSERT INTO titik_banjir_historis (nama_lokasi, wilayah_id, tahun_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan, geom, kecamatan, tanggal_kejadian)
        SELECT $1, w.id, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7,$6),4326), COALESCE(NULLIF($8,''), w.nama_kecamatan), COALESCE($9::date, make_date($2,1,1))
        FROM (SELECT 1) s LEFT JOIN wilayah_administrasi w ON ST_Contains(w.geom, ST_SetSRID(ST_MakePoint($7,$6),4326))
        LIMIT 1`, [nama, tahun, tinggi, parseInt(r.lama_genangan_jam, 10) || null, r.keterangan || null, r.lat, r.lng, r.kecamatan || '', tgl])
      ok++
    }
  } finally { await pool.end() }
  console.log(`${dry ? '[UJI COBA] ' : ''}${ok} titik ${dry ? 'siap diimpor' : 'diimpor'}, ${skip} dilewati (sudah ada), ${bad.length} ditolak.`)
  bad.slice(0, 10).forEach((b) => console.log('  -', b))
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
