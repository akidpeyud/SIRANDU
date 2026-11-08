import { useEffect, useRef, useState } from 'react'
import { useLenis, prefersReducedMotion } from '../lib/motion.jsx'
import logo from '../assets/logo-mark-sm.png'
import heroImg from '../assets/hero.jpg'

/**
 * Layar pembuka: hujan turun, logo & nama SIRANDU muncul, lalu air naik sesuai progres
 * pemuatan (font + foto hero). Saat 100%, air membanjiri layar dan seluruh tirai
 * tersapu ke atas memperlihatkan hero. Animasi hero ditahan (html.is-loading) sampai tirai terbuka.
 * Kunjungan ulang dalam sesi yang sama dipersingkat.
 */
const NAME = 'SIRANDU'
const KEY = 'sirandu-intro-seen'

const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = src })

export default function Preloader() {
  const lenis = useLenis()
  const [phase, setPhase] = useState('load') // load → flood → out → done
  const [pct, setPct] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1') } catch { /* mode privat */ }
    const reduce = prefersReducedMotion()
    const minMs = reduce ? 200 : seen ? 700 : 2300
    const t0 = performance.now()
    let real = 0, raf
    const tasks = [document.fonts?.ready ?? Promise.resolve(), loadImg(heroImg), loadImg(logo)]
    tasks.forEach((p) => p.then(() => { real += 100 / tasks.length }))
    // pengaman: jangan pernah menahan pengguna lebih dari 6 detik
    const guard = setTimeout(() => { real = 100 }, 6000)

    const tick = (now) => {
      const timeCap = Math.min(100, ((now - t0) / minMs) * 100)
      const target = Math.min(real, timeCap)
      shown.current += (target - shown.current) * 0.12
      if (target >= 100 && shown.current > 99.4) shown.current = 100
      setPct(Math.round(shown.current))
      if (shown.current >= 100) { setPhase(reduce ? 'out' : 'flood'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clearTimeout(guard) }
  }, [])

  // fase banjir → tirai naik → selesai
  useEffect(() => {
    if (phase === 'flood') { const t = setTimeout(() => setPhase('out'), 750); return () => clearTimeout(t) }
    if (phase === 'out') {
      document.documentElement.classList.remove('is-loading') // hero mulai beranimasi saat tirai terbuka
      const t = setTimeout(() => setPhase('done'), 1150)
      return () => clearTimeout(t)
    }
  }, [phase])

  // kunci scroll selama layar pembuka tampil
  useEffect(() => {
    if (phase === 'done') { lenis?.start(); document.documentElement.classList.remove('is-loading'); return }
    lenis?.stop(); window.scrollTo(0, 0)
  }, [phase, lenis])

  if (phase === 'done') return null
  const level = phase === 'load' ? pct * (typeof window !== 'undefined' && window.innerWidth < 600 ? 0.3 : 0.38) : 115 // tinggi air (% layar)

  return (
    <div className={`pl pl-${phase}`} role="status" aria-live="polite" aria-label={`Memuat SIRANDU ${pct}%`}>
      <div className="pl-rain" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>

      <div className="pl-center">
        <img className="pl-logo" src={logo} alt="" width="110" height="97" />
        <div className="pl-name" aria-hidden="true">
          {NAME.split('').map((c, i) => <span key={i} style={{ '--i': i }}><b>{c}</b></span>)}
        </div>
        <p className="pl-sub">Sistem Informasi Rawan Bencana · Kota Jambi</p>
      </div>

      <div className="pl-water" style={{ height: `${level}%` }} aria-hidden="true">
        <svg className="pl-wave a" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0 30 Q 90 0 180 30 T 360 30 T 540 30 T 720 30 T 900 30 T 1080 30 T 1260 30 T 1440 30 V60 H0Z" /></svg>
        <svg className="pl-wave b" viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0 30 Q 90 0 180 30 T 360 30 T 540 30 T 720 30 T 900 30 T 1080 30 T 1260 30 T 1440 30 V60 H0Z" /></svg>
        <div className="pl-meter">
          <small>Memuat peta risiko</small>
          <b>{pct}<em>%</em></b>
        </div>
      </div>

      {/* tepi bawah bergelombang saat tirai tersapu ke atas */}
      <svg className="pl-edge" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 H1440 V40 Q 1260 90 1080 50 T 720 50 T 360 50 T 0 40 Z" /></svg>
    </div>
  )
}
