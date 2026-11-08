import { useRef } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

/**
 * "Mengapa SIRANDU" — pernyataan yang menyala kata demi kata mengikuti scroll,
 * frasa kunci digarisbawahi gelombang, "sesudahnya" dicoret, lalu air naik di
 * belakang teks. Di bawahnya dua garis waktu: tanpa vs dengan peringatan dini.
 */
const LINE = [
  { t: 'Informasi bencana seharusnya sampai ke warga' },
  { t: 'sebelum air naik,', k: 'hl' },
  { t: 'bukan' },
  { t: 'sesudahnya.', k: 'x' },
]

const TIMELINES = [
  {
    key: 'late', label: 'Tanpa peringatan dini', verdict: 'Kabar datang terlambat',
    steps: [
      { t: 'Hujan deras', s: 'Tidak ada yang memantau' },
      { t: 'Air masuk rumah', s: 'Jalan sudah tergenang', water: true },
      { t: 'Warga panik', s: 'Mencari posko sendiri' },
      { t: 'Kabar baru tersebar', s: 'Lewat grup pesan, terlambat', bad: true },
    ],
  },
  {
    key: 'early', label: 'Dengan SIRANDU', verdict: 'Warga bergerak lebih dulu',
    steps: [
      { t: 'Hujan terpantau', s: 'Curah hujan dibaca tiap jam' },
      { t: 'Peringatan terkirim', s: 'Status naik, email masuk', good: true },
      { t: 'Warga ke posko', s: 'Lewat jalur evakuasi teraman' },
      { t: 'Air naik', s: 'Rumah sudah kosong, warga aman', water: true },
    ],
  },
]

const Wave = () => (
  <svg className="why-ul" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
    <path d="M2 9 Q 14.5 2 27 9 T 52 9 T 77 9 T 102 9 T 127 9 T 152 9 T 177 9 T 202 9 T 227 9 T 252 9 T 277 9 T 298 9" pathLength="1" />
  </svg>
)

export default function Statement() {
  const root = useRef(null)

  useGSAP(() => {
    const el = root.current
    const words = el.querySelectorAll('.why-w')
    const ul = el.querySelector('.why-ul path')
    const strike = el.querySelector('.why-x i')
    const flood = el.querySelector('.why-flood')
    if (prefersReducedMotion()) {
      gsap.set(words, { opacity: 1, filter: 'none' })
      gsap.set(ul, { strokeDashoffset: 0 }); gsap.set(strike, { scaleX: 1 })
      return
    }

    // 1) kata menyala mengikuti scroll
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el.querySelector('.why-title'), start: 'top 82%', end: 'bottom 38%', scrub: 0.6 },
    })
    tl.fromTo(words, { opacity: 0.1, filter: 'blur(6px)', y: 10 }, { opacity: 1, filter: 'blur(0px)', y: 0, stagger: 0.1, ease: 'none', duration: 0.5 })
      .fromTo(ul, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 0.8 }, '>-0.9')
      .fromTo(strike, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 0.4 }, '>-0.1')

    // 2) air naik di belakang teks
    gsap.fromTo(flood, { yPercent: 100 }, {
      yPercent: 30, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 60%', end: 'bottom bottom', scrub: true },
    })

    // 3) garis waktu: jalur terisi, titik muncul berurutan
    el.querySelectorAll('.tl-row').forEach((row) => {
      const t = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 80%', end: 'top 40%', scrub: 0.5 } })
      t.fromTo(row.querySelector('.tl-fill'), { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 })
      row.querySelectorAll('.tl-step').forEach((s, i) => {
        t.fromTo(s, { opacity: 0.25, y: 14 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, i * 0.4)
      })
      t.fromTo(row.querySelector('.tl-verdict'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.2 }, 0.9)
    })
  }, [])

  let wi = 0
  const renderWords = (text) => text.split(' ').map((w, i, a) => (
    <span key={i}><span className="why-w" style={{ '--i': wi++ }}>{w}</span>{i < a.length - 1 ? ' ' : ''}</span>
  ))

  return (
    <section className="why" ref={root} aria-labelledby="why-title">
      <div className="why-flood" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0 40 Q 180 0 360 40 T 720 40 T 1080 40 T 1440 40 V80 H0Z" /></svg>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0 40 Q 180 0 360 40 T 720 40 T 1080 40 T 1440 40 V80 H0Z" /></svg>
      </div>

      <div className="wrap why-in">
        <div className="why-head">
          <span className="tag rv">Mengapa SIRANDU</span>
          <p className="why-note rv">Banjir di Kota Jambi datang berulang. Yang sering terlambat bukan airnya, tapi kabarnya.</p>
        </div>

        <h2 className="why-title" id="why-title">
          {LINE.map((seg, si) => (
            <span key={si}>
              {seg.k === 'hl' && <span className="why-hl">{renderWords(seg.t)}<Wave /></span>}
              {seg.k === 'x' && <span className="why-x">{renderWords(seg.t)}<i aria-hidden="true" /></span>}
              {!seg.k && renderWords(seg.t)}
              {si < LINE.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>

        <div className="tl" role="list" aria-label="Perbandingan garis waktu saat banjir">
          {TIMELINES.map((row) => (
            <div className={`tl-row ${row.key}`} key={row.key} role="listitem">
              <div className="tl-label">
                <b>{row.label}</b>
                <span className="tl-verdict">{row.verdict}</span>
              </div>
              <div className="tl-track">
                <div className="tl-line"><i className="tl-fill" /></div>
                <ol>
                  {row.steps.map((s) => (
                    <li className={`tl-step${s.bad ? ' bad' : ''}${s.good ? ' good' : ''}${s.water ? ' water' : ''}`} key={s.t}>
                      <span className="tl-dot" aria-hidden="true" />
                      <strong>{s.t}</strong>
                      <small>{s.s}</small>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
