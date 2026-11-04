import { useRef, useState } from 'react'
import { STEPS } from '../data/content.js'
import { ScrollTrigger, useLenis, prefersReducedMotion } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

const DIST = (
  <g transform="translate(250 250) rotate(-6)">
    <path d="M-230 -40 L-150 -105 L-45 -90 L15 -135 L120 -105 L210 -50 L230 28 L155 98 L42 120 L-56 105 L-168 77 Z" fill="rgba(110,193,228,.06)" stroke="rgba(110,193,228,.28)" />
    <path d="M-150 -105 L-70 -14 L15 -135 M-70 -14 L42 14 L120 -105 M42 14 L155 98 M-70 -14 L-56 105" fill="none" stroke="rgba(110,193,228,.22)" />
    <path d="M-250 22 C-180 -22 -140 56 -77 28 S28 -28 84 7 S182 63 252 14" fill="none" stroke="#6EC1E4" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
  </g>
)
const BAR_Y = [330, 300, 315, 260, 225, 245, 190]
const BAR_O = [0.45, 0.5, 0.55, 0.7, 0.85, 0.8, 1]
const ROUTE = 'M110 410 C170 350 150 270 240 250 S350 190 392 112'

const Chip = ({ style, title, sub }) => <div className="hchip" style={style}><b>{title}</b><span>{sub}</span></div>

/** Section terpaku: scroll menggerakkan empat langkah (angka roller, teks, dan ilustrasi). */
export default function HowItWorks() {
  const ref = useRef(null)
  const lenis = useLenis()
  const [i, setI] = useState(0)
  const [p, setP] = useState(0)

  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => { setP(s.progress); setI(Math.min(3, Math.floor(s.progress * 4))) },
    })
    return () => st.kill()
  }, [])

  const go = (k) => {
    const el = ref.current
    const y = el.offsetTop + ((k + 0.5) / 4) * (el.offsetHeight - window.innerHeight)
    lenis ? lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <section className="how" id="cara" ref={ref}>
      <div className="how-in">
        <div className="wrap hw">
          <div className="how-txt">
            <span className="tag">Cara kerja</span>
            <div className="hnum-wrap" aria-hidden="true">
              <div className="hnum" style={{ transform: `translateY(${-i * 25}%)` }}>{STEPS.map((_, k) => <b key={k}>{`0${k + 1}`}</b>)}</div>
            </div>
            <div className="hsteps">
              {STEPS.map((s, k) => (
                <div key={s.title} className={`hs${i === k ? ' on' : ''}`}><h3>{s.title}</h3><p>{s.text}</p></div>
              ))}
            </div>
          </div>

          <div className="how-stage" aria-hidden="true">
            <svg className="base" viewBox="0 0 500 500">
              <defs><pattern id="hw-gp" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(110,193,228,.35)" /></pattern></defs>
              <rect width="500" height="500" fill="url(#hw-gp)" />{DIST}
            </svg>

            <div className={`sc${i === 0 ? ' on' : ''}`}>
              <svg viewBox="0 0 500 500">
                <g className="rp"><circle cx="280" cy="262" r="12" fill="none" stroke="#6EC1E4" strokeWidth="2" /></g>
                <g className="rp r2"><circle cx="280" cy="262" r="12" fill="none" stroke="#6EC1E4" strokeWidth="2" /></g>
                <g className="pin"><path d="M280 262c-22-26-34-42-34-60a34 34 0 0 1 68 0c0 18-12 34-34 60z" fill="#6EC1E4" /><circle cx="280" cy="202" r="12" fill="#0B3C5D" /></g>
              </svg>
              <Chip style={{ left: '57%', top: '27%' }} title="Zona rawan sedang" sub="Kelurahan Anda" />
            </div>

            <div className={`sc${i === 1 ? ' on' : ''}`}>
              <div className="rainov" />
              <svg viewBox="0 0 500 500">
                {BAR_Y.map((y, k) => <rect key={k} className="hb" style={{ '--i': k }} x={70 + k * 53} y={y} width="30" height={440 - y} rx="7" fill="#6EC1E4" fillOpacity={BAR_O[k]} />)}
                <line x1="40" y1="236" x2="470" y2="236" stroke="#fff" strokeDasharray="5 6" opacity=".6" />
                <text x="468" y="226" fill="#fff" fontSize="13" textAnchor="end" fontFamily="Inter,sans-serif">ambang siaga</text>
              </svg>
            </div>

            <div className={`sc${i === 2 ? ' on' : ''}`}>
              <div className="bellrings"><i /><i /><i /></div>
              <div className="notif">
                <span className="bell"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B3C5D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg></span>
                <div><b>Status naik: SIAGA</b><span>Wilayah Anda · baru saja</span></div>
              </div>
              <div className="notif n2">
                <span className="bell dim"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B3C5D" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
                <div><b>Hujan lebat terdeteksi</b><span>10 menit lalu</span></div>
              </div>
            </div>

            <div className={`sc${i === 3 ? ' on' : ''}`}>
              <svg viewBox="0 0 500 500">
                <defs><filter id="hw-gbh"><feGaussianBlur stdDeviation="7" /></filter></defs>
                <path d={ROUTE} fill="none" stroke="#6EC1E4" strokeWidth="16" filter="url(#hw-gbh)" opacity=".55" />
                <path className="rt" pathLength="1" d={ROUTE} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="110" cy="410" r="8" fill="#6EC1E4" />
                <g className="rp"><circle cx="392" cy="112" r="12" fill="none" stroke="#6EC1E4" strokeWidth="2" /></g>
                <circle cx="392" cy="112" r="11" fill="#fff" /><path d="M386 116v-7l6-4 6 4v7z" fill="#0B3C5D" />
                <circle r="5" fill="#6EC1E4"><animateMotion dur="4.5s" repeatCount="indefinite" path={ROUTE} /></circle>
              </svg>
              <Chip style={{ left: '58%', top: '12%' }} title="Posko terdekat" sub="Ikuti jalur aman" />
            </div>
          </div>
        </div>

        <div className="wrap how-idx">
          <span>{`0${i + 1} / 04`}</span>
          <div className="hbar"><i style={{ transform: `scaleX(${p})` }} /></div>
          <div className="tabs">{STEPS.map((_, k) => <button key={k} className={i === k ? 'on' : ''} aria-label={`Langkah ${k + 1}`} onClick={() => go(k)}>{`0${k + 1}`}</button>)}</div>
        </div>
      </div>
    </section>
  )
}
