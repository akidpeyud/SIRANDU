import { useWebgis } from '../context/WebgisContext.jsx'
import { useEffect, useRef, useState } from 'react'
import { clamp, prefersReducedMotion } from '../lib/motion.jsx'
import heroImg from '../assets/hero.jpg'

const LINES = [['tahu', 'risiko,'], ['siap', 'bertindak.']]

export default function Hero() {
  const { openMap, ringkasan } = useWebgis()
  const heroRef = useRef(null)
  const canvasRef = useRef(null)
  const lnRefs = useRef([])
  const rowRef = useRef(null)
  const eyeRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1900)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const hero = heroRef.current, cv = canvasRef.current, ctx = cv.getContext('2d')
    const reduce = prefersReducedMotion()
    let W, H, drops = []
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const d = dpr()
      W = cv.width = hero.clientWidth * d; H = cv.height = hero.clientHeight * d
      drops = Array.from({ length: Math.round(hero.clientWidth / 14) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 20 + Math.random() * 60, v: 0.5 + Math.random() * 1.6, a: 0.1 + Math.random() * 0.4 }))
    }
    resize()
    window.addEventListener('resize', resize)
    let mx = 0, my = 0, tx = 0, ty = 0
    const onMove = (e) => { const r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5 }
    hero.addEventListener('pointermove', onMove)

    let raf
    const loop = () => {
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06
      hero.style.setProperty('--px', mx.toFixed(3)); hero.style.setProperty('--py', my.toFixed(3))
      if (hero.getBoundingClientRect().bottom > 0 && !reduce) {
        ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1.2
        for (const d of drops) {
          d.y += d.v * dpr()
          if (d.y - d.l > H) { d.y = -10; d.x = Math.random() * W }
          const g = ctx.createLinearGradient(0, d.y - d.l, 0, d.y)
          g.addColorStop(0, 'rgba(110,193,228,0)'); g.addColorStop(1, `rgba(110,193,228,${d.a})`)
          ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(d.x + mx * 10, d.y - d.l); ctx.lineTo(d.x + mx * 10, d.y); ctx.stroke()
        }
      }
      // scrub headline saat scroll: baris 1 naik+blur, baris 2 turun+blur
      const vh = window.innerHeight, pr = clamp(window.scrollY / (vh * 0.7), 0, 1), e = 1 - Math.pow(1 - pr, 2)
      const [l1, l2] = lnRefs.current
      if (l1 && l2) {
        l1.style.transform = `translateY(${-90 * e}px)`; l1.style.filter = `blur(${e * 16}px)`; l1.style.opacity = String(1 - Math.min(1, e * 1.25))
        l2.style.transform = `translateY(${120 * e}px)`; l2.style.filter = `blur(${e * 12}px)`; l2.style.opacity = String(1 - Math.min(1, e * 1.05))
        rowRef.current.style.opacity = String(1 - Math.min(1, pr * 2.2)); rowRef.current.style.transform = `translateY(${pr * 40}px)`
        eyeRef.current.style.opacity = String(1 - Math.min(1, pr * 2.5))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); hero.removeEventListener('pointermove', onMove) }
  }, [])

  return (
    <div className="hero-wrap">
      <div className={`hero${ready ? ' ready' : ''}`} ref={heroRef}>
        <div className="hero-bg" aria-hidden="true" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="hero-veil" aria-hidden="true" />
        <canvas ref={canvasRef} id="rain" aria-hidden="true" />
        <div className="glow" />
        <div className="guides">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
        <div className="waves" aria-hidden="true">
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none"><path fill="#1D6FA3" fillOpacity=".45" d="M0 90C120 40 240 40 360 90s240 50 360 0 240-50 360 0 240 50 360 0V200H0z" /></svg>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none"><path fill="#6EC1E4" fillOpacity=".35" d="M0 120C120 80 240 80 360 120s240 40 360 0 240-40 360 0 240 40 360 0V200H0z" /></svg>
        </div>
        <div className="hero-in">
          <span className="eyebrow" ref={eyeRef}>Sistem Informasi Rawan Bencana · Kota Jambi</span>
          <h1 aria-label="tahu risiko, siap bertindak.">
            {LINES.map((words, li) => (
              <span className="ln" key={li} ref={(el) => (lnRefs.current[li] = el)}>
                {words.map((w, i) => (<span key={w}><span className="w" style={{ '--wi': li * 3 + i }}>{w}</span>{' '}</span>))}
              </span>
            ))}
          </h1>
          <div className="hero-row" ref={rowRef}>
            <p>SIRANDU adalah sistem informasi rawan bencana yang memetakan zona risiko, memantau curah hujan, dan menuntun warga Kota Jambi ke posko serta air bersih.</p>
            <div className="right">
              <div className="pill-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .8-5.2 4.8 1.5 7.2L12 18l-6.3 3.8 1.5-7.2L2 9.8 9 9z" /></svg>
                {ringkasan ? <><b>{ringkasan.normal}/{ringkasan.total_kecamatan}</b> kecamatan normal</> : <><b>5 kelas</b> curah hujan</>} <i /> pantau <b>24/7</b>
              </div>
              <button type="button" className="btn white" onClick={() => openMap()}>Buka peta <span className="arr">↗</span></button>
            </div>
          </div>
        </div>
        <div className="scroll-hint">GULIR</div>
      </div>
    </div>
  )
}
