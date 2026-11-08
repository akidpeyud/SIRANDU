import { useEffect, useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import { gsap, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'
import { RAIN_LADDER } from '../data/content.js'

/* Lapisan data yang benar-benar ditarik frontend dari API SIRANDU (lihat services/api.js). */
const LAYERS = [
  ['Curah hujan · Open-Meteo', <g key="a"><path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15z" /><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" /></g>],
  ['Batas kecamatan & kelurahan', <g key="b"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" /><path d="M9 4v14M15 6v14" /></g>],
  ['Zona rawan banjir', <path key="c" d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />],
  ['Ketinggian tanah', <g key="d"><path d="M3 19l6-9 4 5 3-4 5 8z" /></g>],
  ['Buffer sungai Batanghari', <g key="e"><path d="M3 17c3-4 6-4 9 0s6 4 9 0" /><path d="M3 11c3-4 6-4 9 0s6 4 9 0" /></g>],
  ['Titik banjir historis', <g key="f"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></g>],
  ['Posko pengungsian', <g key="g"><path d="M4 20V10l8-6 8 6v10z" /><path d="M10 20v-6h4v6" /></g>],
  ['Sumber air bersih', <path key="h" d="M12 3c3 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9 7 12 3z" />],
  ['Jalan tergenang', <g key="i"><path d="M8 3L5 21M16 3l3 18" /><path d="M12 5v2M12 11v2M12 17v2" /></g>],
]

const STATUS_COLOR = Object.fromEntries(RAIN_LADDER.map((r) => [r.status.split(' ')[0].toLowerCase(), r.color]))
const statusColor = (s) => STATUS_COLOR[String(s || '').split(' ')[0].toLowerCase()] || '#6EC1E4'
const fmtTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })

function Count({ to }) {
  const ref = useRef(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el || to == null) return
    if (prefersReducedMotion()) { setV(to); return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const f = (now) => { const k = Math.min(1, (now - t0) / 1600); setV(Math.round(to * (1 - Math.pow(1 - k, 4)))); if (k < 1) requestAnimationFrame(f) }
      requestAnimationFrame(f)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{v}</span>
}

/** Angka besar; saat data belum ada tampil kerangka berkilau, bukan tanda "–". */
function Num({ n, suffix, state }) {
  if (n != null) return <div className="rk-num"><Count to={n} />{suffix && <em>{suffix}</em>}</div>
  return <div className="rk-num"><span className={`rk-skel${state === 'error' ? ' off' : ''}`} aria-label={state === 'error' ? 'Data belum tersedia' : 'Memuat'} /></div>
}

function Pill({ state }) {
  const txt = { live: 'Data langsung', loading: 'Memuat data', error: 'Belum terhubung' }[state]
  return <span className={`rk-pill ${state}`}><i />{txt}</span>
}

/** Spotlight lembut mengikuti kursor di tiap kartu. */
const spot = (e) => {
  const b = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - b.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - b.top}px`)
}

function RainBars({ data, state }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (prefersReducedMotion()) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  if (!data.length) {
    return (
      <div ref={ref} className={`rk-bars empty${seen ? ' seen' : ''}`} aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => <i key={i} style={{ '--h': `${22 + ((i * 37) % 60)}%`, '--i': i }} />)}
        <span>{state === 'error' ? 'Grafik muncul setelah server cuaca terhubung' : 'Menarik data cuaca…'}</span>
      </div>
    )
  }
  const max = Math.max(5, ...data.map((k) => Number(k.curah_hujan_terkini) || 0))
  return (
    <div ref={ref} className={`rk-bars${seen ? ' seen' : ''}`} role="img" aria-label="Curah hujan terkini per kecamatan">
      {data.map((k, i) => {
        const v = Number(k.curah_hujan_terkini) || 0
        return (
          <i key={k.id ?? k.nama_kecamatan} style={{ '--h': `${Math.max(4, (v / max) * 100)}%`, '--c': statusColor(k.status_peringatan), '--i': i }}>
            <b>{k.nama_kecamatan}<br />{v.toFixed(1)} mm · {k.status_peringatan || 'Normal'}</b>
          </i>
        )
      })}
    </div>
  )
}

const Arrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

export default function Proof() {
  const root = useRef(null)
  const { ringkasan, counts, errorCuaca, loadingCuaca, cuacaData, refreshCuaca, openMap } = useWebgis()

  const cuacaState = cuacaData.length || ringkasan ? 'live' : loadingCuaca ? 'loading' : errorCuaca ? 'error' : 'loading'
  const layerState = (n) => (n != null ? 'live' : counts.ready ? 'error' : 'loading')
  const anyLive = cuacaState === 'live' || [counts.posko, counts.airBersih, counts.jalanTergenang].some((n) => n != null)
  const allDown = cuacaState === 'error' && counts.ready && !anyLive
  const [updated, setUpdated] = useState(null)
  useEffect(() => { if (cuacaData.length) setUpdated(fmtTime.format(new Date()).replace('.', ':')) }, [cuacaData])

  const total = ringkasan?.total_kecamatan ?? (cuacaData.length || null)
  const normal = ringkasan?.normal ?? null

  useGSAP(() => {
    if (prefersReducedMotion()) return
    const el = root.current
    const p = gsap.to(el.querySelector('.rk-marq'), { yPercent: -30, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
    const cards = gsap.from(el.querySelectorAll('.rk-card'), {
      y: 60, opacity: 0, rotateX: -8, transformOrigin: '50% 100%', duration: 1.1, ease: 'power3.out', stagger: 0.1, clearProps: 'transform',
      scrollTrigger: { trigger: el.querySelector('.rk-grid'), start: 'top 85%', once: true },
    })
    return () => { p.scrollTrigger?.kill(); p.kill(); cards.scrollTrigger?.kill(); cards.kill() }
  }, [])

  const CARDS = [
    { key: 'posko', n: counts.posko, title: 'Posko pengungsian', sub: 'Lengkap dengan kapasitas dan kontak penanggung jawab', layers: ['posko'], cta: 'Lihat posko' },
    { key: 'air', n: counts.airBersih, title: 'Titik air bersih', sub: 'Sumur, hidran, dan tangki darurat', layers: ['air'], cta: 'Lihat air bersih' },
    { key: 'jalan', n: counts.jalanTergenang, title: 'Jalan tergenang', sub: 'Dihindari otomatis oleh rute evakuasi', layers: ['jalan'], cta: 'Lihat ruas jalan' },
  ]

  return (
    <section className="proof" id="proof" ref={root}>
      <div className="wrap">
        <div className="rk-head">
          <div>
            <span className="tag rv">Rekam jejak SIRANDU</span>
            <BlurText as="h2" className="rk-title">Apa yang sudah terpantau di Kota Jambi, saat ini juga.</BlurText>
          </div>
          <div className="rk-status rv">
            <span className={`rk-live ${allDown ? 'error' : anyLive ? 'live' : 'loading'}`}>
              <i />{allDown ? 'Server SIRANDU belum terhubung' : anyLive ? `Tersambung${updated ? ` · ${updated} WIB` : ''}` : 'Menghubungkan ke server…'}
            </span>
            {allDown && <button type="button" className="rk-retry" onClick={refreshCuaca}>Coba lagi</button>}
          </div>
        </div>

        <div className="rk-grid">
          {/* Kartu utama: pemantauan hujan */}
          <article className="rk-card rk-rain" onPointerMove={spot}>
            <div className="rk-top">
              <span className="rk-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15z" /><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" /></svg></span>
              <Pill state={cuacaState} />
            </div>
            <div className="rk-mid">
              <Num n={total} suffix="kecamatan" state={cuacaState} />
              <h3>Pemantauan hujan</h3>
              <p>Data Open-Meteo diperbarui tiap jam, lalu diklasifikasikan ke lima level peringatan.</p>
              {normal != null && total != null && (
                <div className="rk-split" aria-label={`${normal} dari ${total} kecamatan berstatus normal`}>
                  <div><i style={{ width: `${(normal / total) * 100}%` }} /></div>
                  <span><b>{normal}</b> normal · <b>{total - normal}</b> perlu dipantau</span>
                </div>
              )}
            </div>
            <RainBars data={cuacaData} state={cuacaState} />
            <a className="rk-cta" href="#klasifikasi">Lihat grafik curah hujan <Arrow /></a>
          </article>

          {CARDS.map((c) => {
            const st = layerState(c.n)
            return (
              <article className={`rk-card rk-${c.key}`} key={c.key} onPointerMove={spot}>
                <div className="rk-art" aria-hidden="true">
                  {c.key === 'posko' && <>{[[18, 30], [42, 62], [66, 26], [78, 70], [30, 78], [56, 44]].map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--i': i }} />)}</>}
                  {c.key === 'air' && <><i /><i /><i /><b /></>}
                  {c.key === 'jalan' && <svg viewBox="0 0 200 120" preserveAspectRatio="none"><path className="road" d="M-10 100 C 60 100, 80 20, 210 30" /><path className="lane" d="M-10 100 C 60 100, 80 20, 210 30" /><path className="puddle" d="M70 78 q 12 -8 24 0 t 24 0" /></svg>}
                </div>
                <div className="rk-top"><Pill state={st} /></div>
                <div className="rk-mid">
                  <Num n={c.n} state={st} />
                  <h3>{c.title}</h3>
                  <p>{c.sub}</p>
                </div>
                <button type="button" className="rk-cta" onClick={() => openMap({ layers: c.layers })}>{c.cta} <Arrow /></button>
              </article>
            )
          })}
        </div>

        <div className="rk-layers">
          <span className="lab rv">Lapisan data yang dihimpun dalam satu peta</span>
          <div className="rk-marq" aria-label="Lapisan data SIRANDU">
            <div className="rk-track">
              {[0, 1].map((dup) => LAYERS.map(([label, icon]) => (
                <span className="rk-chip" key={`${dup}-${label}`} aria-hidden={dup === 1 || undefined}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{icon}</svg>{label}
                </span>
              )))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
