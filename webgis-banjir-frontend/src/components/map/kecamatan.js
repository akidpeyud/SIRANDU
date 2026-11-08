import KEC from '../../data/kecamatanJambi.json'

/**
 * Batas 11 kecamatan Kota Jambi yang dibundel di frontend (gabungan batas kelurahan BPS).
 * Dipakai untuk garis & label kecamatan, filter, dan "titik ada di kecamatan mana",
 * jadi peta tetap rapi walau server belum terhubung.
 */
export const KECAMATAN = KEC
export const KOTA = KEC.kota
export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')
export const findKec = (nama) => KEC.features.find((f) => norm(f.properties.nama_kecamatan) === norm(nama)) || null

/** Titik [lng, lat] di dalam cincin poligon (ray casting). */
function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inPoly = (pt, coords) => inRing(pt, coords[0]) && !coords.slice(1).some((h) => inRing(pt, h))

/** Nama kecamatan untuk titik lat/lng, atau null bila di luar Kota Jambi. */
export function kecamatanAt(lat, lng) {
  const f = KEC.features.find((k) => inPoly([lng, lat], k.geometry.coordinates))
  return f ? f.properties.nama_kecamatan : null
}

/** Bounds Leaflet [[lat, lng], [lat, lng]] dari satu fitur (atau seluruh kota). */
export function boundsOf(feature = KOTA) {
  let s = 90, w = 180, n = -90, e = -180
  feature.geometry.coordinates[0].forEach(([x, y]) => { s = Math.min(s, y); n = Math.max(n, y); w = Math.min(w, x); e = Math.max(e, x) })
  return [[s, w], [n, e]]
}

/** Topeng: seluruh dunia dengan lubang di wilayah terpilih, untuk meredupkan area lain. */
export function maskFor(feature) {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[90, -30], [130, -30], [130, 30], [90, 30], [90, -30]], feature.geometry.coordinates[0]] } }
}
