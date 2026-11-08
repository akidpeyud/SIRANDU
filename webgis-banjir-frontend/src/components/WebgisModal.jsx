import { lazy, Suspense, useEffect, useState } from 'react'
import { useWebgis } from '../context/WebgisContext.jsx'
import { useLenis, prefersReducedMotion } from '../lib/motion.jsx'
import logo from '../assets/logo-mark-sm.png'

// Leaflet dimuat hanya saat peta dibuka, supaya halaman utama tetap ringan.
const WebgisMap = lazy(() => import('./map/WebgisMap.jsx'))
const EXIT_MS = 760

/**
 * Peta WebGIS native React (react-leaflet).
 * Saat ditutup tidak langsung hilang: gelombang biru naik menutup peta (±0,4 dtk),
 * lalu semuanya memudar memperlihatkan beranda (±0,35 dtk).
 */
export default function WebgisModal() {
  const { isMapOpen, closeMap } = useWebgis()
  const lenis = useLenis()
  const [shown, setShown] = useState(isMapOpen)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (isMapOpen) { setShown(true); setLeaving(false); return }
    if (!shown) return
    setLeaving(true)
    const t = setTimeout(() => { setShown(false); setLeaving(false) }, prefersReducedMotion() ? 160 : EXIT_MS)
    return () => clearTimeout(t)
  }, [isMapOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shown) return
    lenis?.stop(); document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && closeMap()
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; lenis?.start() }
  }, [shown, closeMap, lenis])

  if (!shown) return null
  return (
    <div className={`gm-modal${leaving ? ' gm-leaving' : ''}`} data-lenis-prevent role="dialog" aria-modal="true" aria-label="Peta WebGIS SIRANDU">
      <Suspense fallback={<div className="gm-load"><span className="gm-spin big" />Memuat peta…</div>}>
        <WebgisMap />
      </Suspense>
      {leaving && (
        <div className="gm-exit" aria-hidden="true">
          <svg className="gm-exit-wave" viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0 40 Q 180 0 360 40 T 720 40 T 1080 40 T 1440 40 V80 H0Z" /></svg>
          <div className="gm-exit-in"><img src={logo} alt="" width="54" height="48" /><span>Kembali ke beranda</span></div>
        </div>
      )}
    </div>
  )
}
