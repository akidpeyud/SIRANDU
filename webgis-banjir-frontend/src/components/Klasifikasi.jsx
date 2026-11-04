import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BlurText from '../lib/BlurText.jsx'
import { prefersReducedMotion } from '../lib/motion.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import RainChart from './RainChart.jsx'
import { RAIN_BOUNDS as B, RAIN_CLASSES } from '../data/content.js'

gsap.registerPlugin(ScrollTrigger)

// Slider = 6 segmen sama lebar (non-linear) supaya kelas sempit tetap mudah dipilih.
const toMm = (v) => { const t = (v / 1000) * 6, i = Math.min(5, Math.floor(t)), f = t - i; return B[i] + f * (B[i + 1] - B[i]) }
const toSlider = (mm) => { let i = 0; while (i < 5 && mm > B[i + 1]) i++; return Math.round(((i + (mm - B[i]) / (B[i + 1] - B[i])) / 6) * 1000) }
const classify = (mm) => (mm < 5 ? 0 : mm <= 20 ? 1 : mm <= 50 ? 2 : mm <= 100 ? 3 : mm <= 150 ? 4 : 5)
const MID = [2, 12, 35, 75, 125, 175]
const RANGE = ['< 5', '5–20', '20–50', '50–100', '100–150', '> 150']
const RAIN_OPA = [0, 0.28, 0.5, 0.72, 0.9, 1]
const PROBS = [
  ['Angka tanpa arti', 'Prakiraan hanya menulis “80 mm/hari”. Warga awam tidak tahu itu aman atau berbahaya.'],
  ['Tak ada patokan lokal', 'Tidak ada yang menghubungkan curah hujan dengan risiko banjir di wilayah mereka.'],
  ['Sadar terlambat', 'Warga baru tahu setelah air naik, dan tidak sempat bersiap atau mengungsi.'],
]
const HOUSES = [[70, 76, 1], [190, 64, 0], [300, 84, 1], [430, 70, 0], [545, 90, 1], [670, 64, 0]]

const ArrowIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

export default function Klasifikasi() {
  const root = useRef(null), stage = useRef(null), water = useRef(null), fill = useRef(null), num = useRef(null)
  const sm = useRef({ mm: 0 })
  const demo = useRef(null)
  // Aksi pengguna selalu menghentikan demo otomatis.
  const pick = (val) => { demo.current?.kill(); setV(val) }
  const { cuacaData, errorCuaca, loadingCuaca } = useWebgis()
  const [kecId, setKecId] = useState(null)
  const [total24, setTotal24] = useState(null)
  const activeKec = kecId ?? cuacaData[0]?.id ?? null
  const [v, setV] = useState(0)
  const mm = Math.round(toMm(v))
  const idx = classify(mm)
  const c = RAIN_CLASSES[idx]

  // Gerakkan air/tabung secara halus (GSAP), tanpa re-render per frame.
  const paint = () => {
    const m = sm.current.mm
    const y = 392 - Math.min(m, 200) / 200 * 195
    if (water.current) water.current.style.transform = `translateY(${y}px)`
    if (fill.current) fill.current.style.transform = `scaleY(${Math.min(m, 200) / 200})`
    if (num.current) num.current.textContent = m >= 199.5 ? '200+' : Math.round(m)
  }
  useEffect(() => {
    gsap.to(sm.current, { mm: toMm(v), duration: prefersReducedMotion() ? 0 : 1.1, ease: 'power3.out', overwrite: true, onUpdate: paint })
  }, [v])

  // Demo otomatis saat bagian ini terlihat: hujan naik dari 0 ke Lebat.
  useEffect(() => {
    if (prefersReducedMotion()) { setV(toSlider(75)); return }
    const st = ScrollTrigger.create({
      trigger: root.current, start: 'top 55%', once: true,
      onEnter: () => {
        const o = { s: 0 }
        demo.current = gsap.to(o, { s: toSlider(80), duration: 3.2, ease: 'power2.inOut', onUpdate: () => setV(Math.round(o.s)) })
      },
    })
    gsap.fromTo('.kz-in', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
    return () => { st.kill(); demo.current?.kill() }
  }, [])

  const pct = (v / 1000) * 100
  return (
    <section className="cls" id="klasifikasi" ref={root}>
      <div className="wrap">
        <span className="tag rv">Klasifikasi curah hujan</span>
        <BlurText as="h2" style={{ maxWidth: 900 }}>Dari angka mentah jadi tindakan.</BlurText>
        <p className="lead rv">Standar BMKG untuk curah hujan harian, diterjemahkan jadi level yang langsung dimengerti. Geser pengukur dan lihat apa yang terjadi di kota.</p>

        <div className="kz-probs">
          {PROBS.map(([t, d], i) => <div className="kz-in kz-prob" key={t}><b>0{i + 1}</b><h4>{t}</h4><p>{d}</p></div>)}
        </div>

        <div className={`kz-stage kz-in${idx === 5 ? ' alarm' : ''}`} ref={stage} style={{ '--c': c.color, '--lv': idx }}>
          {/* langit & hujan */}
          <div className="kz-sky" />
          <svg className="kz-clouds" viewBox="0 0 800 140" preserveAspectRatio="none" aria-hidden="true">
            <g className="cl a"><ellipse cx="160" cy="62" rx="120" ry="34" /><ellipse cx="240" cy="48" rx="80" ry="30" /><ellipse cx="90" cy="70" rx="70" ry="26" /></g>
            <g className="cl b"><ellipse cx="520" cy="50" rx="140" ry="38" /><ellipse cx="610" cy="40" rx="90" ry="30" /><ellipse cx="430" cy="64" rx="80" ry="28" /></g>
            <g className="cl c"><ellipse cx="760" cy="70" rx="100" ry="30" /><ellipse cx="690" cy="76" rx="70" ry="24" /></g>
          </svg>
          {[0, 1, 2].map((n) => <div key={n} className={`kz-rain r${n}`} style={{ opacity: RAIN_OPA[idx] * [1, .8, .6][n] }} />)}

          {/* kota & air */}
          <svg className="kz-city" viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <path d="M0 292 L0 250 Q120 215 260 245 T560 232 T800 252 V292Z" fill="#082b44" opacity=".7" />
            {HOUSES.map(([x, w, t], i) => (
              <g key={i} transform={`translate(${x} 0)`}>
                <rect x="0" y={292 - 62} width={w} height="62" fill="#0d3f61" />
                <path d={`M-8 ${292 - 62} L${w / 2} ${292 - 100} L${w + 8} ${292 - 62}Z`} fill={t ? '#1b5a82' : '#164b6e'} />
                <rect x={w / 2 - 8} y={292 - 30} width="16" height="30" rx="2" fill="#072338" />
                <rect x="10" y={292 - 50} width="14" height="14" rx="2" className={`win${idx >= 2 ? ' on' : ''}`} />
                <rect x={w - 24} y={292 - 50} width="14" height="14" rx="2" className={`win${idx >= 2 ? ' on' : ''}`} />
              </g>
            ))}
            <rect x="0" y="292" width="800" height="130" fill="#06243a" />
            <g ref={water} className="kz-water" style={{ transform: 'translateY(392px)' }}>
              <path className="w1" d="M0 0 Q50 -16 100 0 T200 0 T300 0 T400 0 T500 0 T600 0 T700 0 T800 0 T900 0 T1000 0 T1100 0 T1200 0 V460 H0Z" />
              <path className="w2" d="M0 6 Q50 -10 100 6 T200 6 T300 6 T400 6 T500 6 T600 6 T700 6 T800 6 T900 6 T1000 6 T1100 6 T1200 6 V460 H0Z" />
            </g>
          </svg>

          {/* tabung pengukur */}
          <div className="kz-gauge" aria-hidden="true">
            <div className="tube">
              <div className="fill" ref={fill} />
              {[5, 20, 50, 100, 150].map((n) => <span key={n} style={{ bottom: `${(n / 200) * 100}%` }}><i />{n}</span>)}
            </div>
            <em>mm</em>
          </div>

          {/* HUD */}
          <div className="kz-hud">
            <div className="kz-num"><b ref={num}>0</b><span>mm/hari</span></div>
            <div className="kz-pill"><i /><b>{c.status}</b><em>{c.kelas}</em></div>
          </div>
          <p className="kz-act" key={idx}>{c.aksi}</p>
        </div>

        <div className="kz-ctrl kz-in">
          <input type="range" min="0" max="1000" value={v} onChange={(e) => pick(+e.target.value)} id="simR" aria-label="Curah hujan harian dalam milimeter" style={{ '--p': `${pct}%` }} />
          <div className="sim-lab">{[5, 20, 50, 100, 150].map((n, i) => <span key={n} style={{ left: `${((i + 1) / 6) * 100}%` }}>{n}</span>)}</div>
        </div>

        <div className="kz-levels kz-in" role="list">
          {RAIN_CLASSES.map((r, i) => (
            <button key={r.kelas} role="listitem" className={`kz-lv${idx === i ? ' on' : ''}`} style={{ '--c': r.color }} onClick={() => pick(toSlider(MID[i]))}>
              <span className="bar" />
              <small>{RANGE[i]} mm</small>
              <b>{i === 0 ? 'Sangat ringan' : r.kelas}</b>
              <em>{r.status}</em>
            </button>
          ))}
        </div>

        <div className="kz-data kz-in">
          <div className="kz-data-head">
            <span className="tag" style={{ marginBottom: 8 }}>Data langsung</span>
            <h3>Hujan 24 jam terakhir di 11 kecamatan</h3>
            <p>Dari Open-Meteo, diperbarui otomatis tiap jam. Status Waspada dan Siaga dihitung per jam: lebih dari 5 mm/jam dan lebih dari 10 mm/jam.</p>
          </div>
          {errorCuaca && !cuacaData.length ? (
            <p className="rc-err">Data cuaca belum bisa dimuat: {errorCuaca.message}</p>
          ) : (
            <>
              <div className="kz-kec" role="tablist" aria-label="Pilih kecamatan">
                {loadingCuaca && !cuacaData.length && <span className="kz-skel" />}
                {cuacaData.map((k) => (
                  <button key={k.id} type="button" role="tab" aria-selected={activeKec === k.id} className={activeKec === k.id ? 'on' : ''} style={{ '--c': { Siaga: '#ef4444', Waspada: '#f59e0b' }[k.status_peringatan] || '#10b981' }} onClick={() => setKecId(k.id)}>
                    <i />{k.nama_kecamatan}
                  </button>
                ))}
              </div>
              <RainChart kecamatanId={activeKec} onTotal={setTotal24} />
              {total24 != null && (
                <button type="button" className="kz-use" onClick={() => { pick(toSlider(Math.min(200, total24))); document.querySelector('.kz-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
                  Coba di simulasi: {Math.round(total24)} mm/hari → kelas BMKG <ArrowIcon />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
