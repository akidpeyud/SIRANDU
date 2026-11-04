import { useEffect, useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import { gsap, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

const ICONS = [
  <path key="a" d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />,
  <g key="b"><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 12h16" /></g>,
  <g key="c"><path d="M3 17c3-4 6-4 9 0s6 4 9 0" /><path d="M3 11c3-4 6-4 9 0s6 4 9 0" /></g>,
  <g key="d"><path d="M4 20V10l8-6 8 6v10z" /><path d="M10 20v-6h4v6" /></g>,
  <g key="e"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></g>,
  <path key="f" d="M12 3c3 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9 7 12 3z" />,
  <g key="g"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12h8M12 8v8" /></g>,
]

function Count({ to }) {
  const ref = useRef(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || to == null) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const f = (now) => { const k = Math.min(1, (now - t0) / 1400); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f) }
      requestAnimationFrame(f)
    }, { threshold: 0.18 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{to == null ? '–' : v}</span>
}

export default function Proof() {
  const logosRef = useRef(null)
  const { ringkasan, counts, errorCuaca } = useWebgis()
  const METRICS = [
    { n: ringkasan?.total_kecamatan ?? null, suffix: ' kec', title: 'Pemantauan hujan', sub: 'Open-Meteo, diperbarui tiap jam' },
    { n: counts.posko, suffix: '', title: 'Posko pengungsian', sub: 'Terpetakan di Kota Jambi' },
    { n: counts.airBersih, suffix: '', title: 'Titik air bersih', sub: 'Sumur, hidran & tangki' },
    { n: counts.jalanTergenang, suffix: '', title: 'Jalan tergenang terpantau', sub: 'Dipakai untuk menghindari rute banjir' },
  ]
  useGSAP(() => {
    if (prefersReducedMotion()) return
    const t = gsap.to(logosRef.current, { y: -24, ease: 'none', scrollTrigger: { trigger: '.proof', start: 'top bottom', end: 'bottom top', scrub: true } })
    return () => { t.scrollTrigger?.kill(); t.kill() }
  }, [])
  return (
    <section className="proof" id="proof">
      <div className="wrap">
        <span className="lab rv">Mitra &amp; pemangku kepentingan yang kami libatkan</span>
        <div className="logos rv" aria-hidden="true" ref={logosRef}>
          {ICONS.map((p, i) => (
            <div key={i}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{p}</svg></div>
          ))}
        </div>
        <BlurText as="h2" className="sm">rekam jejak SIRANDU</BlurText>
        {METRICS.map((m, i) => (
          <div className="mrow rv" key={m.title} style={i === METRICS.length - 1 ? { borderBottom: '1px solid var(--line)' } : undefined}>
            <small><b>{m.title}</b>{m.sub}{(errorCuaca || m.n == null) && <><br />(data belum tersedia)</>}</small>
            <div className={`big${m.n == null ? ' empty' : ''}`}><Count to={m.n} />{m.n == null ? '' : m.suffix}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
