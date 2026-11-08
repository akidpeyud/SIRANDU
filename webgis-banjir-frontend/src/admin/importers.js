/**
 * Membaca file impor di browser → bentuk seragam:
 *   { kind: 'table', columns: string[], rows: object[] }            (CSV / TSV / Excel)
 *   { kind: 'geo', columns: string[], features: GeoJSON.Feature[] }  (GeoJSON / KML / GPX / Shapefile .zip)
 * Pustaka berat dimuat hanya saat jenis file itu dipilih.
 */
export const ACCEPT = '.csv,.tsv,.txt,.xlsx,.geojson,.json,.kml,.gpx,.zip'
export const FORMATS = [
  ['CSV / TSV', 'Tabel teks, pemisah koma, titik koma, atau tab'],
  ['Excel .xlsx', 'Lembar pertama, baris pertama = judul kolom'],
  ['GeoJSON', 'FeatureCollection titik, garis, atau poligon (WGS84)'],
  ['KML / GPX', 'Ekspor Google Earth, My Maps, atau GPS'],
  ['Shapefile .zip', 'Satu .zip berisi .shp, .dbf, .shx, .prj (dari QGIS/ArcGIS)'],
]

const ext = (name) => (name.split('.').pop() || '').toLowerCase()
const colsOf = (objs) => { const s = new Set(); objs.slice(0, 500).forEach((o) => Object.keys(o || {}).forEach((k) => s.add(k))); return [...s] }

async function readTable(file) {
  const e = ext(file.name)
  if (e === 'xlsx') {
    const { default: readXlsxFile } = await import('read-excel-file')
    const rows = await readXlsxFile(file)
    if (!rows.length) return { kind: 'table', columns: [], rows: [] }
    const head = rows[0].map((h, i) => (h == null || String(h).trim() === '' ? `Kolom ${i + 1}` : String(h).trim()))
    const data = rows.slice(1).filter((r) => r.some((c) => c != null && String(c).trim() !== ''))
      .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] instanceof Date ? r[i].toISOString().slice(0, 10) : r[i] ?? ''])))
    return { kind: 'table', columns: head, rows: data }
  }
  const { default: Papa } = await import('papaparse')
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim(),
      complete: (r) => resolve({ kind: 'table', columns: r.meta.fields || [], rows: r.data }),
      error: (err) => reject(new Error(`CSV tidak terbaca: ${err.message}`)),
    })
  })
}

function flatten(geo) {
  if (!geo) return []
  if (Array.isArray(geo)) return geo.flatMap(flatten)
  if (geo.type === 'FeatureCollection') return (geo.features || []).filter((f) => f && f.geometry)
  if (geo.type === 'Feature') return geo.geometry ? [geo] : []
  if (geo.type && geo.coordinates) return [{ type: 'Feature', properties: {}, geometry: geo }]
  if (geo.type === 'GeometryCollection') return (geo.geometries || []).map((g) => ({ type: 'Feature', properties: {}, geometry: g }))
  return []
}

async function readGeo(file) {
  const e = ext(file.name)
  let features
  if (e === 'zip') {
    const { default: shp } = await import('shpjs')
    try { features = flatten(await shp(await file.arrayBuffer())) }
    catch (x) { throw new Error(`Shapefile tidak terbaca. Pastikan .zip berisi .shp, .dbf, dan .prj. (${x.message})`) }
  } else if (e === 'kml' || e === 'gpx') {
    const tg = await import('@tmcw/togeojson')
    const dom = new DOMParser().parseFromString(await file.text(), 'text/xml')
    if (dom.querySelector('parsererror')) throw new Error(`File ${e.toUpperCase()} rusak atau bukan XML yang valid.`)
    features = flatten(e === 'kml' ? tg.kml(dom) : tg.gpx(dom))
  } else {
    let json
    try { json = JSON.parse(await file.text()) } catch { throw new Error('File JSON tidak valid.') }
    const crs = json?.crs?.properties?.name
    if (crs && !/4326|CRS84/i.test(crs)) throw new Error(`GeoJSON memakai sistem koordinat ${crs}. Ekspor ulang dari QGIS dengan CRS EPSG:4326 (WGS84), atau kirim sebagai Shapefile .zip lengkap dengan .prj.`)
    features = flatten(json)
  }
  // properti bersarang (mis. dari KML) diratakan jadi teks
  features = features.map((f) => ({ ...f, properties: Object.fromEntries(Object.entries(f.properties || {}).filter(([, v]) => typeof v !== 'object' || v === null)) }))
  return { kind: 'geo', columns: colsOf(features.map((f) => f.properties)), features }
}

export async function parseFile(file) {
  const e = ext(file.name)
  if (file.size > 40 * 1024 * 1024) throw new Error('File lebih dari 40 MB. Sederhanakan geometri atau pecah file.')
  if (['csv', 'tsv', 'txt', 'xlsx'].includes(e)) return readTable(file)
  if (['geojson', 'json', 'kml', 'gpx', 'zip'].includes(e)) return readGeo(file)
  if (e === 'xls') throw new Error('Format .xls lama belum didukung. Simpan ulang sebagai .xlsx atau CSV.')
  if (e === 'kmz') throw new Error('KMZ belum didukung. Di Google Earth, simpan ulang sebagai .kml.')
  if (e === 'shp') throw new Error('Unggah Shapefile sebagai satu .zip (berisi .shp, .dbf, .shx, .prj), bukan .shp saja.')
  throw new Error(`Format .${e} tidak didukung.`)
}

/* ---------- pembantu nilai ---------- */
export const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim().replace(/\s/g, '')
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.')
  if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '') // 1.234,5 | 1,234.5
  else if (c > -1) s = s.replace(',', '.') // -1,6101 (format Indonesia)
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
export const toDate = (v) => {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + +s * 864e5); return d.toISOString().slice(0, 10) } // nomor seri Excel
  return null
}
export const toBool = (v, d = true) => {
  if (v === null || v === undefined || v === '') return d
  return !/^(0|false|tidak|no|non ?aktif|surut|n)$/i.test(String(v).trim())
}

export function downloadCsv(name, columns, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
