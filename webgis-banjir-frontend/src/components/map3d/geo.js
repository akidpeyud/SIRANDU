import { toLocal } from '../../data/jambiGeo.js'

/** Ubah fitur GeoJSON jadi titik/garis lokal. */
export function pointsFrom(geo) {
  return (geo?.features || []).filter((f) => f.geometry?.type === 'Point').map((f) => {
    const [x, y] = toLocal(f.geometry.coordinates)
    return { x, y, name: f.properties?.nama_posko || f.properties?.nama || f.properties?.nama_sumber || f.properties?.jenis || null, props: f.properties || {} }
  })
}
export function linesFrom(geo) {
  const out = []
  ;(geo?.features || []).forEach((f) => {
    const g = f.geometry; if (!g) return
    const parts = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
    parts.forEach((c) => c.length > 1 && out.push({ pts: c.map(toLocal), wet: !!f.properties?.status_tergenang }))
  })
  return out
}

