import { Fragment, useEffect, useRef } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { TEAM } from '../data/content.js'
import { gsap, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

const Silhouette = ({ id }) => (
  <svg viewBox="0 0 120 160" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
    <defs><linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E6F3FA" /><stop offset="1" stopColor="#6EC1E4" /></linearGradient></defs>
    <circle cx="60" cy="60" r="25" fill={`url(#sg-${id})`} />
    <path d="M6 160c2-42 22-62 54-62s52 20 54 62z" fill={`url(#sg-${id})`} opacity=".92" />
  </svg>
)

const Social = () => (
  <div className="soc">
    <a href="#tim" aria-label="Surel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></a>
    <a href="#tim" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13a3 3 0 0 1 6 0v4" /></svg></a>
    <a href="#tim" aria-label="Tautan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg></a>
  </div>
)

/** Kartu tim: cahaya, garis tepi, gradien nama, dan tilt 3D mengikuti kursor (react-bits SpotlightCard + TiltedCard). */
function TeamCard({ m, i }) {
  const card = useRef(null), nm = useRef(null)
  const s = useRef({ x: 0, y: 0, tx: 0, ty: 0, rx: 0, ry: 0, trx: 0, try_: 0, hov: false, ph: i * 2.1, init: false })

  useEffect(() => {
    const c = card.current, o = s.current, reduce = prefersReducedMotion()
    const enter = () => { o.hov = true; c.classList.add('hov') }
    const leave = () => { o.hov = false; c.classList.remove('hov'); o.trx = 0; o.try_ = 0 }
    const move = (e) => {
      const r = c.getBoundingClientRect(); o.tx = e.clientX - r.left; o.ty = e.clientY - r.top
      if (!reduce) { o.trx = (o.ty / r.height - 0.5) * -7; o.try_ = (o.tx / r.width - 0.5) * 7 }
    }
    c.addEventListener('pointerenter', enter); c.addEventListener('pointerleave', leave); c.addEventListener('pointermove', move)
    let raf
    const frame = (now) => {
      const r = c.getBoundingClientRect()
      if (r.bottom > -50 && r.top < window.innerHeight + 50) {
        if (!o.init) { o.x = o.tx = r.width / 2; o.y = o.ty = r.height * 0.4; o.init = true }
        if (!o.hov) { o.tx = r.width * (0.5 + 0.32 * Math.cos(now / 2800 + o.ph)); o.ty = r.height * (0.42 + 0.28 * Math.sin(now / 2300 + o.ph)) }
        o.x += (o.tx - o.x) * 0.11; o.y += (o.ty - o.y) * 0.11; o.rx += (o.trx - o.rx) * 0.1; o.ry += (o.try_ - o.ry) * 0.1
        c.style.setProperty('--mx', o.x.toFixed(1) + 'px'); c.style.setProperty('--my', o.y.toFixed(1) + 'px')
        const n = nm.current.getBoundingClientRect()
        nm.current.style.setProperty('--nx', (o.x - (n.left - r.left)).toFixed(1) + 'px'); nm.current.style.setProperty('--ny', (o.y - (n.top - r.top)).toFixed(1) + 'px')
        if (!reduce) c.style.transform = `rotateX(${o.rx.toFixed(2)}deg) rotateY(${o.ry.toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); c.removeEventListener('pointerenter', enter); c.removeEventListener('pointerleave', leave); c.removeEventListener('pointermove', move) }
  }, [])

  return (
    <article className="tc rv" style={{ '--d': `${m.delay}s` }}>
      <div className="tc-card" ref={card}>
        <div className="tc-glow" /><div className="tc-grain" />
        <div className="tc-in">
          <div className="tc-txt">
            <div className="tc-top"><span className="tc-idx">{m.idx}</span><span className="tc-role">{m.role}</span></div>
            <h3 className="tc-name" ref={nm}>{m.name.map((n, k) => <Fragment key={k}>{k > 0 && <br />}{n}</Fragment>)}</h3>
            <em className="tc-sub">{m.sub}</em>
            <p>{m.bio}</p>
          </div>
          <div className="ph"><div className="ph-ring" /><div className="ph-in"><Silhouette id={i} /></div></div>
        </div>
        <div className="tc-ft"><div className="chips">{m.tags.map((t) => <span key={t}>{t}</span>)}</div><Social /></div>
      </div>
    </article>
  )
}

export default function Team() {
  useGSAP(() => {
    if (prefersReducedMotion()) return
    const t = gsap.from('.team', { y: 90, ease: 'none', scrollTrigger: { trigger: '.team', start: 'top bottom', end: 'top 55%', scrub: true } })
    return () => { t.scrollTrigger?.kill(); t.kill() }
  }, [])
  return (
    <section className="team" id="tim">
      <div className="wrap">
        <BlurText as="h2" className="tm-h">Tim</BlurText>
        <div className="tm-links"><a className="btn dark" href="#tim">Kenali tim SIRANDU <span className="arr">↗</span></a><a className="lk" href="#mulai">Bergabung sebagai relawan ↗</a></div>
        <div className="tc-grid">{TEAM.map((m, i) => <TeamCard key={m.idx} m={m} i={i} />)}</div>
      </div>
    </section>
  )
}
