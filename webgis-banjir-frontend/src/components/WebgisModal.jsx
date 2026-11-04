import { lazy, Suspense, useEffect } from 'react'
import { useWebgis } from '../context/WebgisContext.jsx'
import { useLenis } from '../lib/motion.jsx'

// Leaflet dimuat hanya saat peta dibuka, supaya halaman utama tetap ringan.
const WebgisMap = lazy(() => import('./map/WebgisMap.jsx'))

/** Peta WebGIS native React (react-leaflet): satu bundle, satu state, tanpa iframe. */
export default function WebgisModal() {
  const { isMapOpen, closeMap } = useWebgis()
  const lenis = useLenis()

  useEffect(() => {
    if (!isMapOpen) return
    lenis?.stop(); document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && closeMap()
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; lenis?.start() }
  }, [isMapOpen, closeMap, lenis])

  if (!isMapOpen) return null
  return (
    <div className="gm-modal" role="dialog" aria-modal="true" aria-label="Peta WebGIS SIRANDU">
      <Suspense fallback={<div className="gm-load"><span className="gm-spin big" />Memuat peta…</div>}>
        <WebgisMap />
      </Suspense>
    </div>
  )
}
