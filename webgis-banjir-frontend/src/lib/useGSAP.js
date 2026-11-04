import { useEffect } from 'react'
import { gsap } from './motion.jsx'

/**
 * Jalankan setup GSAP di dalam gsap.context lalu REVERT saat unmount.
 * Tanpa revert, gsap.from() yang dibatalkan di React StrictMode (mode `npm run dev`)
 * meninggalkan elemen tetap transparan (opacity 0) dan animasi kedua tidak pernah memunculkannya.
 */
export function useGSAP(setup, deps = []) {
  useEffect(() => {
    let cleanup
    const ctx = gsap.context(() => { cleanup = setup() })
    return () => {
      ctx.revert()
      if (typeof cleanup === 'function') cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
