import { useEffect, useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { RING_INFO } from '../data/content.js'
import { prefersReducedMotion } from '../lib/motion.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'

const RINGS = [[170, 105], [300, 185], [440, 265]]
const ROT = (-6 * Math.PI) / 180
const NODES = [
  { r: 0, t: 0.2, s: 0.13 }, { r: 0, t: 3.6, s: 0.13 }, { r: 1, t: 1.4, s: -0.09 }, { r: 1, t: 4.4, s: -0.09 },
  { r: 2, t: 0.6, s: 0.06 }, { r: 2, t: 2.6, s: 0.06 }, { r: 2, t: 4.9, s: 0.06 },
]
const FAR = [[60, 430], [930, 90], [940, 590], [210, 60]]
const ANCHORS = [0, 3, 4, 6]
const CHIPS = [
  { r: 0, n: '12', t: 'Posko pengungsian', left: '22%', top: '20%' },
  { r: 1, n: '5', t: 'Kelas curah hujan', left: '56%', top: '26%' },
  { r: 2, n: '20+', t: 'Titik air bersih', left: '70%', top: '80%' },
  { r: 0, n: '8', t: 'Jalur evakuasi', left: '88%', top: '56%' },
]

const pos = (ri, t) => {
  const [a, b] = RINGS[ri], x = a * Math.cos(t), y = b * Math.sin(t)
  return [500 + x * Math.cos(ROT) - y * Math.sin(ROT), 330 + x * Math.sin(ROT) + y * Math.cos(ROT)]
}

export default function PetaOrbit() {
  const { openMap } = useWebgis()
  const secRef = useRef(null), stageRef = useRef(null), orbRef = useRef(null), dustRef = useRef(null)
  const nodeEls = useRef([]), linkEls = useRef([])
  const [seen, setSeen] = useState(false)
  const [cur, setCur] = useState(0)
  const [hold, setHold] = useState(false)

  // masuk viewport -> peta & chip muncul
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.1 })
    io.observe(secRef.current)
    return () => io.disconnect()
  }, [])

  // siklus cincin tiap 4 detik (berhenti saat hover)
  useEffect(() => {
    if (hold) return
    const id = setTimeout(() => setCur((c) => (c + 1) % 4), 4000)
    return () => clearTimeout(id)
  }, [cur, hold])

  // animasi orbit + debu partikel + parallax kursor
  useEffect(() => {
    const stage = stageRef.current, orb = orbRef.current, dc = dustRef.current, dx = dc.getContext('2d')
    const reduce = prefersReducedMotion()
    const nodes = NODES.map((n) => ({ ...n, x: 0, y: 0 }))
    let sx = 0, sy = 0, tsx = 0, tsy = 0, DW, DH, dots = []
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const d = dpr(); DW = dc.width = stage.clientWidth * d; DH = dc.height = stage.clientHeight * d
      dots = Array.from({ length: 260 }, () => { const a = Math.random() * 6.283, r = Math.pow(Math.random(), 0.6) * 0.5; return { x: DW / 2 + Math.cos(a) * r * DW * 1.1, y: DH / 2 + Math.sin(a) * r * DH * 1.2, z: Math.random(), p: Math.random() * 6.283 } })
    }
    resize(); window.addEventListener('resize', resize)
    const onMove = (e) => { const r = stage.getBoundingClientRect(); tsx = (e.clientX - r.left) / r.width - 0.5; tsy = (e.clientY - r.top) / r.height - 0.5 }
    stage.addEventListener('pointermove', onMove)
    let T0 = performance.now(), raf
    const loop = (now) => {
      const dt = (now - T0) / 1000; T0 = now
      sx += (tsx - sx) * 0.05; sy += (tsy - sy) * 0.05
      nodes.forEach((n, i) => {
        if (!reduce) n.t += n.s * dt
        const [x, y] = pos(n.r, n.t); n.x = x; n.y = y
        const el = nodeEls.current[i]; if (el) { el.setAttribute('cx', x); el.setAttribute('cy', y) }
      })
      linkEls.current.forEach((l, i) => {
        if (!l) return; const a = nodes[ANCHORS[i]]
        l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', FAR[i][0]); l.setAttribute('y2', FAR[i][1])
      })
      orb.style.transform = `translate(${sx * -14}px,${sy * -10}px)`
      dx.clearRect(0, 0, DW, DH)
      for (const p of dots) {
        p.p += 0.015 + p.z * 0.01
        const a = 0.25 + 0.55 * Math.abs(Math.sin(p.p))
        dx.fillStyle = `rgba(200,232,248,${a * (0.4 + p.z * 0.6)})`
        dx.fillRect(p.x + sx * -30 * p.z * dpr() + Math.sin(now / 3000 + p.z * 9) * 3, p.y + sy * -20 * p.z * dpr(), 1 + p.z * 1.6, 1 + p.z * 1.6)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); stage.removeEventListener('pointermove', onMove) }
  }, [])

  const ringOn = Math.min(cur, 2)
  const info = RING_INFO[cur]

  return (
    <section className={`net${seen ? ' in' : ''}`} id="peta" ref={secRef}>
      <div className="wrap">
        <div className="net-head">
          <span className="tag rv">Peta Kota Jambi</span>
          <BlurText as="h2">Satu peta, empat lapis perlindungan untuk warga Jambi.</BlurText>
          <p className="lead rv">Dari titik rumah Anda, SIRANDU menghubungkan zona risiko, posko, jalur evakuasi, dan sumber air bersih di sekitar Sungai Batanghari.</p>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => openMap()}
              className="btn pri rv"
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Buka Peta Interaktif SIRANDU (5 Layer) 🗺️
            </button>
            <a className="net-link rv" href="#fitur">Lihat semua fitur ↗</a>
          </div>
        </div>
      </div>

      <div className="stage" ref={stageRef}>
        <canvas ref={dustRef} />
        <div className="halo" />
        <svg className="orb" ref={orbRef} viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g className="mapg" transform="translate(500 330) rotate(-6)">
            <path className="dist" d="M-330 -60 L-210 -150 L-60 -130 L20 -190 L170 -150 L300 -70 L330 40 L220 140 L60 170 L-80 150 L-240 110 Z" />
            <path className="dist" d="M-210 -150 L-100 -20 L20 -190 M-100 -20 L60 20 L170 -150 M60 20 L220 140 M-100 -20 L-80 150" />
            <path className="river" d="M-360 30 C-260 -30 -200 80 -110 40 S40 -40 120 10 S260 90 360 20" />
          </g>
          <g transform="translate(500 330) rotate(-6)">
            {RINGS.map(([rx, ry], i) => <ellipse key={i} className={`ring${ringOn === i ? ' on' : ''}`} rx={rx} ry={ry} />)}
          </g>
          <g stroke="rgba(255,255,255,.28)" strokeWidth="1">{FAR.map((_, i) => <line key={i} ref={(el) => (linkEls.current[i] = el)} />)}</g>
          <g>
            {NODES.map((n, i) => <circle key={i} ref={(el) => (nodeEls.current[i] = el)} r={n.r === 0 ? 5 : 4} fill="#fff" />)}
            {FAR.map((f, i) => <circle key={`f${i}`} cx={f[0]} cy={f[1]} r="4" fill="#6EC1E4" />)}
          </g>
        </svg>
        <div 
          className="core" 
          aria-label="SIRANDU" 
          onClick={() => openMap()}
          style={{ cursor: 'pointer' }}
          title="Klik untuk Buka WebGIS Interaktif"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0B3C5D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c3 4.2 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9 7.2 12 3z" /></svg>
        </div>
        {CHIPS.map((c) => (
          <div 
            key={c.t} 
            className={`chip${c.r === ringOn ? ' on' : ''}`} 
            style={{ left: c.left, top: c.top, cursor: 'pointer' }}
            onClick={() => openMap()}
            title="Klik untuk membuka peta tematik"
          >
            <b>{c.n}</b>
            <span>{c.t}</span>
          </div>
        ))}
      </div>

      <div className="wrap">
        <div className="rings-info">
          {RING_INFO.map((r, i) => (
            <div key={r.label} className={`rc${cur === i ? ' on' : ''}`}
              onMouseEnter={() => { setCur(i); setHold(true) }} onMouseLeave={() => setHold(false)} onClick={() => setCur(i)}
              onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', e.clientX - b.left + 'px'); e.currentTarget.style.setProperty('--my', e.clientY - b.top + 'px') }}>
              <i className="dt" /><b>{r.n}</b><span>{r.label}</span>
            </div>
          ))}
        </div>
        <div className="ring-desc">
          <div><small>{info.kicker}</small><p>{info.text}</p></div>
          <small>DATA REAL-TIME POSTGIS &amp; OPEN-METEO</small>
        </div>
      </div>
    </section>
  )
}
