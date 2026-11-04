import { useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { FEATURES } from '../data/content.js'
import { useWebgis } from '../context/WebgisContext.jsx'
import { BACKGROUNDS } from './FeatureBackgrounds.jsx'
import { gsap, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

/** Kartu accordion: satu kartu melebar, lainnya menyempit dengan judul vertikal. */
export default function Features() {
  const { openMap } = useWebgis()
  const [open, setOpen] = useState(0)
  const accRef = useRef(null)
  const hover = useRef(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return
    const t = gsap.from(accRef.current.children, { opacity: 0, y: 70, duration: 1.1, ease: 'power4.out', stagger: 0.09, scrollTrigger: { trigger: accRef.current, start: 'top 82%', once: true } })
    return () => { t.scrollTrigger?.kill(); t.kill() }
  }, [])

  const onKey = (e, i) => {
    const n = FEATURES.length
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(i) }
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + n - 1) % n : null
    if (to !== null) { e.preventDefault(); setOpen(to); accRef.current.children[to].focus() }
  }

  return (
    <section id="fitur" className="feat">
      <div className="wrap">
        <span className="tag rv">Fitur</span>
        <BlurText as="h2" style={{ maxWidth: 1080 }}>Warga berhak tahu kondisi lingkungannya sendiri dan harus ke mana saat air naik.</BlurText>
        <div className="acc" ref={accRef}>
          {FEATURES.map((f, i) => {
            const Bg = BACKGROUNDS[f.bg]
            return (
              <div key={f.title} className={`pc${open === i ? ' open' : ''}`} role="button" tabIndex={0} aria-expanded={open === i}
                onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; clearTimeout(hover.current); hover.current = setTimeout(() => setOpen(i), 90) }}
                onPointerLeave={() => clearTimeout(hover.current)}
                onClick={() => setOpen(i)} onKeyDown={(e) => onKey(e, i)}>
                <Bg />
                <span className="vt">{f.title}</span>
                <div className="body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <a className="pl" href={f.goto || '#peta'} onClick={(e) => { if (!f.goto) { e.preventDefault(); openMap({ layers: f.layers }) } }}><span>{f.link}</span><i>↗</i></a>
                  <small>DI DALAM FITUR</small>
                  <div className="chips">{f.chips.map((c) => <span key={c}>{c}</span>)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
