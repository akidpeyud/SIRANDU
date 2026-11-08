import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { KECAMATAN, norm } from './kecamatan.js'

/**
 * Animasi hujan langsung di atas peta: di setiap kecamatan yang sedang hujan
 * (curah_hujan_terkini ≥ 0,3 mm/jam dari server), awan bergerak + rintik hujan
 * yang kerapatannya mengikuti intensitas, dipotong tepat di batas kecamatan.
 * Status Siaga/Awas mendapat kilat sesekali. Digambar di satu <canvas> di pane sendiri
 * (di atas warna zona, di bawah penanda), tanpa menangkap klik.
 */
const MIN_MM = 0.3

export default function RainLayer({ cuaca, enabled = true }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pane = map.getPane('p-rain') || map.createPane('p-rain')
    pane.style.zIndex = 448; pane.style.pointerEvents = 'none'
    const canvas = L.DomUtil.create('canvas', 'gm-rain-cv', pane)
    const ctx = canvas.getContext('2d')
    let dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, raf, zooming = false

    const byName = new Map(cuaca.map((k) => [norm(k.nama_kecamatan), k]))
    // tiap kecamatan yang hujan: partikel dalam koordinat ternormalisasi kotak batasnya
    const areas = KECAMATAN.features.map((f) => {
      const c = byName.get(norm(f.properties.nama_kecamatan))
      const mm = +c?.curah_hujan_terkini || 0
      if (mm < MIN_MM) return null
      const st = String(c.status_peringatan || '').toLowerCase()
      const ring = f.geometry.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng))
      const n = Math.round(Math.min(260, 40 + mm * 22))
      return {
        ring, mm, storm: st.startsWith('siaga') || st.startsWith('awas'),
        drops: Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 0.8, l: 0.6 + Math.random() * 0.8 })),
        clouds: Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.2 + i * 0.3, r: 0.35 + Math.random() * 0.25, v: 0.01 + Math.random() * 0.015 })),
        flash: 0, nextFlash: performance.now() + 2000 + Math.random() * 6000,
      }
    }).filter(Boolean)

    const size = () => {
      const s = map.getSize(); W = s.x; H = s.y
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    }
    const place = () => L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]))
    size(); place()
    const onResize = () => { size(); place() }
    const onMove = () => place()
    const onZs = () => { zooming = true; ctx.clearRect(0, 0, canvas.width, canvas.height) }
    const onZe = () => { zooming = false; place() }
    map.on('resize', onResize); map.on('move', onMove); map.on('zoomstart', onZs); map.on('zoomend', onZe)

    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (!zooming) {
        const zoom = map.getZoom()
        for (const a of areas) {
          const pts = a.ring.map((ll) => map.latLngToContainerPoint(ll))
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
          pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) })
          if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue
          const bw = x1 - x0, bh = y1 - y0
          ctx.save()
          ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip()

          // bayangan awan bergerak
          for (const c of a.clouds) {
            if (!reduce) c.x = (c.x + c.v * dt * 3) % 1.4
            const cx = x0 + (c.x - 0.2) * bw, cy = y0 + c.y * bh, r = c.r * Math.max(bw, bh)
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
            g.addColorStop(0, `rgba(10,30,50,${0.16 + Math.min(0.14, a.mm / 80)})`); g.addColorStop(1, 'rgba(10,30,50,0)')
            ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
          }

          // rintik: panjang & kecepatan mengikuti zoom dan intensitas
          const len = Math.max(6, Math.min(22, 4 + zoom - 8)) * (0.8 + Math.min(0.6, a.mm / 20))
          ctx.strokeStyle = 'rgba(214,240,255,0.75)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'
          ctx.beginPath()
          for (const d of a.drops) {
            if (!reduce) { d.y += d.s * dt * (0.9 + a.mm / 25); if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() } }
            const px = x0 + d.x * bw, py = y0 + d.y * bh, l = len * d.l
            ctx.moveTo(px, py); ctx.lineTo(px - l * 0.22, py + l)
          }
          ctx.stroke()

          // kilat untuk Siaga/Awas
          if (a.storm && !reduce) {
            if (now > a.nextFlash) { a.flash = 1; a.nextFlash = now + 3500 + Math.random() * 6000 }
            if (a.flash > 0) {
              ctx.fillStyle = `rgba(235,245,255,${0.28 * a.flash})`; ctx.fillRect(x0, y0, bw, bh)
              a.flash = Math.max(0, a.flash - dt * (a.flash > 0.6 ? 6 : 2.5))
            }
          }
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    if (areas.length) raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      map.off('resize', onResize); map.off('move', onMove); map.off('zoomstart', onZs); map.off('zoomend', onZe)
      canvas.remove()
    }
  }, [map, cuaca, enabled])

  return null
}
