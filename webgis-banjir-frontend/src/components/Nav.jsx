import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'
import { NAV_LINKS } from '../data/content.js'
import { useLenis } from '../lib/motion.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'

const fmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })

export default function Nav() {
  const lenis = useLenis()
  const { openMap } = useWebgis()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const [compact, setCompact] = useState(false)
  const [time, setTime] = useState('--:--')

  useEffect(() => {
    const tick = () => setTime(fmt.format(new Date()).replace('.', ':'))
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [])

  // Nav terang saat berada di atas section terang, gelap di atas section gelap.
  useEffect(() => {
    const onScroll = () => {
      const q = (s) => document.querySelector(s)
      const heroDark = q('.proof').getBoundingClientRect().top > 40
      const dark = heroDark || [...document.querySelectorAll('.problem,.net,.cta,.how')].some((e) => {
        const r = e.getBoundingClientRect(); return r.top < 40 && r.bottom > 40
      })
      const teamUp = q('.team').getBoundingClientRect().top < 40
      setSolid(!dark || teamUp)
      setCompact(window.scrollY > 60)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!lenis) return
    open ? lenis.stop() : lenis.start()
    document.body.style.overflow = open ? 'hidden' : ''
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, lenis])

  const solidNow = solid && !open

  return (
    <>
      <header className={`nav${solidNow ? ' solid' : ''}${compact ? ' compact' : ''}`}>
        <a className="logo" href="#top" aria-label="SIRANDU">
          <img className="lg" src={logo} alt="Logo SIRANDU" width="44" height="44" />
          <span className="t">SIRANDU</span>
        </a>
        <div className="navr">
          <div className="clock" aria-label="Waktu Jambi"><i /><span>Jambi</span><b style={{ fontWeight: 500 }}>{time}</b></div>
          <button type="button" className="menu-btn map-btn" onClick={() => openMap()}>PETA</button>
          <a className="menu-btn admin-btn" href="#/admin" aria-label="Masuk admin" title="Masuk admin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            <span>ADMIN</span>
          </a>
          <button className="menu-btn" aria-expanded={open} aria-controls="overlay" onClick={() => setOpen((o) => !o)}>
            MENU
            <svg className="chev" width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2l5 5-5 5M18 2l-5 5 5 5" /></svg>
          </button>
        </div>
      </header>
      <nav className={`overlay${open ? ' open' : ''}`} id="overlay" aria-label="Navigasi utama" onClick={() => setOpen(false)}>
        {NAV_LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        <a href="#peta" onClick={(e) => { e.preventDefault(); openMap() }}>Peta WebGIS ↗</a>
        <a href="#/admin" className="ov-admin">Masuk admin ↗</a>
      </nav>
    </>
  )
}
