import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { features, roles, needs, detail, team, steps } from './data.js'
import { Reveal, SplitChars } from './ui.jsx'
import { Preview, Logo } from './previews.jsx'
import { IMG } from './images.js'
import WaterCanvas from './WaterCanvas.jsx'
import { water } from './store.js'

gsap.registerPlugin(ScrollTrigger, useGSAP)
const ease = [0.2, 0.7, 0.2, 1]
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const MENU = [['fitur', 'Fitur'], ['hujan', 'Curah Hujan'], ['alur', 'Cara Kerja'], ['peta', 'Peta'], ['peringatan', 'Peringatan'], ['tim', 'Tim']]

function useClock() {
  const f = () => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()).replace('.', ':')
  const [t, setT] = useState(f)
  useEffect(() => { const i = setInterval(() => setT(f()), 15000); return () => clearInterval(i) }, [])
  return t
}

export function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const time = useClock()
  useEffect(() => { const f = () => setScrolled(window.scrollY > 60); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  return (
    <>
      <header className="fnav">
        <motion.a layout href="#top" className="logo-tile" aria-label="SIRANDU" transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
          <Logo />
          <AnimatePresence initial={false}>
            {scrolled && <motion.span key="nm" className="logo-name" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.45, ease }}>SIRANDU</motion.span>}
          </AnimatePresence>
        </motion.a>
        <div className="fpill">
          <span className="live"><i />Jambi</span><time>{time}</time>
          <motion.button whileTap={{ scale: 0.94 }} className="menu-btn" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'TUTUP' : 'MENU'}</motion.button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div key="ov" className="overlay open" initial={{ clipPath: 'circle(0% at 95% 4%)' }} animate={{ clipPath: 'circle(150% at 95% 4%)' }} exit={{ clipPath: 'circle(0% at 95% 4%)' }} transition={{ duration: 0.7, ease }}>
            {MENU.map(([id, l], i) => (
              <motion.a key={id} href={`#${id}`} onClick={() => setOpen(false)} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.07, duration: 0.6, ease }} whileHover={{ x: 14 }}>
                <small>/ {String(i + 1).padStart(2, '0')}</small>{l}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function Hero() {
  const root = useRef()
  useGSAP(() => {
    if (reduced()) return
    gsap.to(water.hero, {
      level: 0.85, ease: 'none',
      onUpdate: () => root.current && root.current.style.setProperty('--lv', water.hero.level),
      scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.8 },
    })
    const st = { trigger: root.current, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.65), scrub: 0.6 }
    // kebalikan intro: baris atas keluar ke atas, baris bawah keluar ke bawah, garis tengah memudar
    gsap.to('.ln-top', { yPercent: -125, ease: 'power2.in', scrollTrigger: st })
    gsap.to('.ln-bot', { yPercent: 125, ease: 'power2.in', scrollTrigger: st })
    gsap.fromTo('.hero2 .slit', { opacity: 1, scaleX: 1 }, { opacity: 0, scaleX: 0.2, ease: 'none', immediateRender: false, scrollTrigger: st })
    gsap.fromTo('.hero2 .lead, .hero2 .cta', { opacity: 1, y: 0 }, { opacity: 0, y: -30, ease: 'none', immediateRender: false, scrollTrigger: { ...st, end: () => '+=' + Math.round(window.innerHeight * 0.4) } })
  }, { scope: root })
  const open = [0.76, 0, 0.24, 1]
  return (
    <section id="top" className="hero2" ref={root}>
      <i className="sun" aria-hidden />
      <WaterCanvas source="hero" fog="#7ACDE2" mountains />
            <div className="gauge" aria-hidden><span className="cap">muka air (ilustrasi)</span><div className="rule" /><div className="mk">naik</div></div>
      <div className="h2-in">
        <h1 aria-label="Kenali rawan banjir sebelum air datang.">
          <span className="line"><span className="ln ln-top"><motion.span initial={{ y: '-110%' }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: open, delay: 0.3 }}>Kenali <span className="hl">rawan banjir</span></motion.span></span></span>
          <motion.i className="slit" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: open, delay: 0.1 }} />
          <span className="line"><span className="ln ln-bot"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: open, delay: 0.3 }}>sebelum air <span className="hl2">datang.<svg className="wavy" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden><motion.path d="M2 12 q12-14 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#2BBBD7" strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.5, duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} /></svg></span></motion.span></span></span>
        </h1>
        <motion.p className="lead c" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}>SIRANDU adalah Sistem Informasi Rawan Bencana Terpadu untuk Kota Jambi: peta kerawanan, curah hujan, posko, dan jalur evakuasi dalam satu website.</motion.p>
        <motion.div className="cta c" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.7 }}>
          <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#fitur" className="btn">Jelajahi fitur</motion.a>
          <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#peta" className="btn ghost">Lihat peta</motion.a>
        </motion.div>
      </div>
    </section>
  )
}

const AUTO_MS = 5200
export function Picker() {
  const [role, setRole] = useState(0)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [seen, setSeen] = useState(false)
  const box = useRef()
  const need = needs.findIndex((n) => n.feature === active)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 })
    box.current && io.observe(box.current)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen || paused || reduce) return
    const t = setTimeout(() => setActive((a) => (a + 1) % features.length), AUTO_MS)
    return () => clearTimeout(t)
  }, [active, seen, paused, reduce])
  return (
    <section id="fitur" className="sec sheet s-paper">
      <Reveal>
        <p className="sec-no">Fitur</p>
        <h2 className="wide">Tujuh alat untuk satu tujuan: warga siap menghadapi banjir.</h2>
      </Reveal>
      <Reveal delay={100} className="sentence">
        <span>Saya</span>
        <div className="seg" role="tablist">{roles.map((r, i) => <button key={r.id} role="tab" aria-selected={i === role} className={i === role ? 'on' : ''} onClick={() => setRole(i)}>{r.label}</button>)}</div>
        <span>ingin</span>
        <div className="seg" role="tablist">{needs.map((n, i) => <button key={n.id} role="tab" aria-selected={i === need} className={i === need ? 'on' : ''} onClick={() => setActive(n.feature)}>{n.label}</button>)}</div>
        <span>.</span>
      </Reveal>
      <p className="role-note">{roles[role].note}</p>
      <div ref={box} className="panels" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {features.map((f, i) => {
          const on = i === active
          return (
            <button key={f.id} className={`panel ${on ? 'open' : ''}`} onClick={() => setActive(i)} onFocus={() => setActive(i)} aria-expanded={on} aria-label={f.title}>
              <img className="pimg" src={IMG[f.id]} alt="" loading="lazy" draggable="false" />
              <span className="pshade" />
              <span className="vlabel">{f.title}</span>
              <span className="pbody">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="plink"><span>{detail[f.id].link}</span><b aria-hidden>&#8599;</b></span>
                <small>DI DALAM FITUR</small>
                <span className="chips">{detail[f.id].chips.map((c) => <em key={c}>{c}</em>)}</span>
              </span>
              {on && !reduce && seen && !paused && <i key={active} className="pbar" style={{ animationDuration: AUTO_MS + 'ms' }} />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

const RIVER = 'M-20 230 C 40 230 70 250 120 250 S 230 250 270 275 S 330 300 370 300 S 470 300 520 250 S 580 200 620 200 S 740 205 780 245 S 830 290 870 290 S 960 290 1020 270'
// [x, y, jalur kartu, ilustrasi]; 'low' = kartu di bawah sungai, 'high' = kartu di atas
const STATIONS = [[120, 250, 'low', 'hujan'], [370, 300, 'low', 'banjir'], [620, 200, 'high', 'notif'], [870, 290, 'low', 'evakuasi']]

export function Steps() {
  const root = useRef(), pathRef = useRef(), marker = useRef(), count = useRef()
  useGSAP(() => {
    const mm = gsap.matchMedia()
    const cards = gsap.utils.toArray('.rv-card')
    mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
      const p = pathRef.current, len = p.getTotalLength()
      // cari progres tempat sungai melewati tiap stasiun
      const at = STATIONS.map(([sx]) => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const d = Math.abs(p.getPointAtLength((i / 400) * len).x - sx); if (d < bd) { bd = d; best = i / 400 } } return best })
      gsap.set('.river-draw', { strokeDasharray: len, strokeDashoffset: len })
      gsap.set(cards, { opacity: 0, y: 50, clipPath: 'inset(0 0 100% 0)' })
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current, start: 'top top', end: '+=3400', pin: true, scrub: 0.7, anticipatePin: 1,
          onUpdate: (self) => {
            const pt = p.getPointAtLength(self.progress * len)
            if (marker.current) { marker.current.style.left = (pt.x / 1000) * 100 + '%'; marker.current.style.top = (pt.y / 500) * 100 + '%' }
            const n = at.filter((t) => self.progress >= t - 0.02).length
            if (count.current) count.current.textContent = `Langkah ${Math.max(n, 1)} dari ${STATIONS.length}`
          },
        },
      })
      tl.to('.river-draw', { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
      cards.forEach((c, i) => {
        tl.to(c, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.12, ease: 'power3.out' }, Math.max(at[i] - 0.03, 0))
        tl.fromTo(`.stn-${i}`, { scale: 1, backgroundColor: '#FFFEF8' }, { scale: 1.7, backgroundColor: '#FFD758', duration: 0.06 }, at[i])
      })
      tl.to('.rv-title', { yPercent: -30, opacity: 0.35, ease: 'none', duration: 0.4 }, 0.5)
    })
    mm.add('(max-width: 860px), (prefers-reduced-motion: reduce)', () => {
      cards.forEach((c) => gsap.fromTo(c, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 88%' } }))
    })
    return () => mm.revert()
  }, { scope: root })
  return (
    <section id="alur" className="river" ref={root}>
      <div className="rv-stage">
        <div className="rv-title">
          <p className="sec-no">Cara kerja</p>
          <h2>Dari data mentah ke keputusan di lapangan.</h2>
        </div>
        <div className="rv-box">
          <svg className="rv-svg" viewBox="0 0 1000 500" aria-hidden>
            <path d={RIVER} className="river-bank" />
            <path d={RIVER} className="river-draw wide" ref={pathRef} />
            <path d={RIVER} className="river-draw thin" />
          </svg>
          {STATIONS.map(([x, y, lane], i) => (
            <span key={i} aria-hidden>
              <i className="conn" style={lane === 'low' ? { left: x / 10 + '%', top: y / 5 + '%', height: 64 - y / 5 + '%' } : { left: x / 10 + '%', top: 34 + '%', height: y / 5 - 34 + '%' }} />
              <i className={`stn stn-${i}`} style={{ left: x / 10 + '%', top: y / 5 + '%' }} />
            </span>
          ))}
          <i className="rv-marker" ref={marker} aria-hidden />
          {steps.map((s, i) => (
            <article key={s.n} className={`rv-card lane-${STATIONS[i][2]}`} style={{ left: STATIONS[i][0] / 10 + '%' }}>
              <Preview id={STATIONS[i][3]} />
              <h3>{s.n}</h3>
              <p>{s.t}</p>
            </article>
          ))}
        </div>
        <p className="rv-count" ref={count}>Langkah 1 dari {STATIONS.length}</p>
      </div>
    </section>
  )
}

function TeamCard({ m, i }) {
  const rx = useMotionValue(0), ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 140, damping: 16 }), sry = useSpring(ry, { stiffness: 140, damping: 16 })
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * 14); rx.set(-(py - 0.5) * 14)
    e.currentTarget.style.setProperty('--mx', px * 100 + '%'); e.currentTarget.style.setProperty('--my', py * 100 + '%')
  }
  const leave = () => { rx.set(0); ry.set(0) }
  return (
    <motion.article className="tcard" style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      onPointerMove={move} onPointerLeave={leave}
      initial={{ opacity: 0, x: i ? 140 : -140, rotate: i ? 6 : -6 }} whileInView={{ opacity: 1, x: 0, rotate: 0 }} viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 70, damping: 16, delay: i * 0.15 }}>
      <span className="sheen" aria-hidden />
      <div className="who">
        <motion.div className="avatar" aria-hidden animate={{ y: [0, -9, 0] }} transition={{ repeat: Infinity, duration: 4 + i, ease: 'easeInOut' }}>
          <span>{m.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
        </motion.div>
        <div><small>{m.role}</small><h3>{m.name}</h3><p className="lead2">Fokus: {m.lead}</p></div>
      </div>
      <p className="bio">{m.bio}</p>
      <div className="prev"><span>Keahlian</span>
        <motion.span className="chips" initial="h" whileInView="s" viewport={{ once: true }} variants={{ h: {}, s: { transition: { staggerChildren: 0.12, delayChildren: 0.5 + i * 0.15 } } }}>
          {m.tags.map(t => <motion.em key={t} variants={{ h: { opacity: 0, scale: 0.5, y: 10 }, s: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 14 } } }}>{t}</motion.em>)}
        </motion.span>
      </div>
    </motion.article>
  )
}

export function Team() {
  return (
    <section id="tim" className="sec sheet s-cream">
      <p className="sec-no">Tim</p>
      <h2 className="wide big-h"><SplitChars text="Tim pengembang" /></h2>
      <Reveal delay={200} variant="left"><div className="cta"><a href="#peringatan" className="btn dark">Hubungi tim</a><a href="#top" className="btn outline">Tentang proyek</a></div></Reveal>
      <div className="team">{team.map((m, i) => <TeamCard key={m.name} m={m} i={i} />)}</div>
      <p className="muted small">Placeholder: ganti nama dan deskripsi di src/data.js.</p>
    </section>
  )
}

export function Finale() {
  const root = useRef()
  useGSAP(() => {
    if (reduced()) { water.finale.level = 0.6; return }
    gsap.fromTo(water.finale, { level: 0.1 }, { level: 0.5, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'center center', scrub: 0.8 } })
  }, { scope: root })
  return (
    <section className="finale" ref={root}>
      <WaterCanvas source="finale" amp={0.22} rain={false} />
            <div className="fin-in">
        
        <p className="duo">Untuk warga dan posko di Kota Jambi</p>
        <h2 className="giant"><SplitChars text="Siap sebelum air datang" /></h2>
        <div className="cta">
          <motion.a whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} href="#peringatan" className="btn dark">Daftar peringatan</motion.a>
          <span className="callpill"><i className="dot" /><span><small>Notifikasi email per wilayah</small><b>Gratis untuk warga Kota Jambi</b></span></span>
        </div>
      </div>
    </section>
  )
}

export function FloatCTA() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const f = () => setShow(window.scrollY > 500)
    f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <AnimatePresence>
      {show && <motion.a key="f" href="#peringatan" className="floatcta show" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }} whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>Daftar peringatan</motion.a>}
    </AnimatePresence>
  )
}
