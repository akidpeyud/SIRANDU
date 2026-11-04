import { useEffect } from 'react'
import { gsap, prefersReducedMotion } from './motion.jsx'

/** Tombol magnetik (terinspirasi react-bits Magnet) untuk semua elemen .btn. */
export function useMagnet() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return
    const off = []
    document.querySelectorAll('.btn').forEach((b) => {
      const move = (e) => {
        const r = b.getBoundingClientRect()
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: 'power3.out' })
      }
      const leave = () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,.4)' })
      b.addEventListener('pointermove', move)
      b.addEventListener('pointerleave', leave)
      off.push(() => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave) })
    })
    return () => off.forEach((f) => f())
  }, [])
}
